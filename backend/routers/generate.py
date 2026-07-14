from fastapi import APIRouter, HTTPException
from models.requests import PaperRequest
from db.supabase_client import supabase
import fitz
import io
import base64
import json
import os
import time
import random
from pathlib import Path
from groq import Groq
from openai import OpenAI
from db.cerebras_client import get_cerebras_client, CEREBRAS_TEXT_MODEL

router = APIRouter()

STORAGE_BUCKET = "Notes"
# Resolve the workspace root dynamically (parent of backend/ directory)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
LOCAL_SAVE_DIR = BASE_DIR / "dataset" / "temporary data"

# Groq: used ONLY for vision (PDF page transcription)
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

# Challenge id → human difficulty label
DIFFICULTY_MAP = {
    "rookie":      "65% Easy questions (basic recall, definitions and simple concepts) + 25% Medium questions (application of concepts, standard exam-style questions) + 10% Hard questions (advanced analysis, multi-step reasoning)",
    "practice":    "50% Easy questions (basic recall, definitions and simple concepts) + 30% Medium questions (application of concepts, standard exam-style questions) + 20% Hard questions (advanced analysis, multi-step reasoning)",
    "competitive": "40% Easy questions (basic recall, definitions and simple concepts) + 35% Medium questions (application of concepts, standard exam-style questions) + 25% Hard questions (advanced analysis, multi-step reasoning)",
    "topper":      "35% Easy questions (basic recall, definitions and simple concepts) + 35% Medium questions (application of concepts, standard exam-style questions) + 30% Hard/Expert questions (comprehensive, GATE / competitive exam level)",
}

# ── Groq client (vision only) ────────────────────────────────────────────────
_groq_client = None

def get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in .env")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


# ── Vision: transcribe one page ───────────────────────────────────────────────
def transcribe_page_with_vision(page: fitz.Page, page_num: int, client: Groq) -> str:
    mat     = fitz.Matrix(2.0, 2.0)
    pix     = page.get_pixmap(matrix=mat)
    img_b64 = base64.b64encode(pix.tobytes("png")).decode("utf-8")

    response = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{img_b64}"},
                },
                {
                    "type": "text",
                    "text": (
                        "Transcribe ALL content from this page exactly as it appears. "
                        "Include all text, headings, bullet points, numbered lists, "
                        "tables (as markdown), formulas, and describe any diagrams in detail. "
                        "Preserve the logical reading order. Do not add commentary."
                    )
                }
            ],
        }],
        max_tokens=4096,
    )
    return response.choices[0].message.content.strip()


# ── Download PDF + transcribe all pages ──────────────────────────────────────
def download_pdf_text(notes_url: str, topic_name: str) -> str:
    local_path = LOCAL_SAVE_DIR / notes_url
    pdf_bytes = None

    # Try to load from local cache first
    if local_path.exists():
        print(f"  Using cached PDF: {local_path}")
        try:
            pdf_bytes = local_path.read_bytes()
        except Exception as e:
            print(f"  [WARN] Failed to read cached file {local_path}: {e}")

    # Fallback to downloading if not cached or failed to read
    if not pdf_bytes:
        print(f"  Downloading from Supabase: {notes_url}")
        try:
            pdf_bytes = supabase.storage.from_(STORAGE_BUCKET).download(notes_url)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to download PDF for '{topic_name}': {str(e)}"
            )

        # Cache locally for future requests (graceful fallback if cache save fails)
        try:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(pdf_bytes)
            print(f"  Successfully cached PDF locally at: {local_path}")
        except Exception as e:
            print(f"  [WARN] Failed to cache PDF locally: {e}")

    doc    = fitz.open(stream=io.BytesIO(pdf_bytes), filetype="pdf")
    
    # Try direct text extraction first to bypass slow/costly Groq Vision OCR for text PDFs
    direct_text = ""
    for page_num, page in enumerate(doc, start=1):
        page_text = page.get_text()
        if page_text.strip():
            direct_text += f"--- Page {page_num} ---\n{page_text}\n\n"
            
    if len(direct_text.strip()) > 100:
        print(f"  [PDF TEXT HIT] Extracted {len(direct_text):,} characters directly from PDF for '{topic_name}'.")
        doc.close()
        return direct_text.strip()

    # 1. Render all pages to base64 images in the main thread (thread-safe, very fast)
    pages_to_process = []
    for page_num, page in enumerate(doc, start=1):
        mat     = fitz.Matrix(2.0, 2.0)
        pix     = page.get_pixmap(matrix=mat)
        img_b64 = base64.b64encode(pix.tobytes("png")).decode("utf-8")
        pages_to_process.append((page_num, img_b64))
    
    doc.close()

    from concurrent.futures import ThreadPoolExecutor

    client = get_groq_client()
    print(f"  Transcribing {len(pages_to_process)} page(s) in parallel via Groq Vision...")

    def transcribe_image_page(args):
        p_num, img_b64 = args
        try:
            response = client.chat.completions.create(
                model=VISION_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/png;base64,{img_b64}"},
                        },
                        {
                            "type": "text",
                            "text": (
                                "Transcribe ALL content from this page exactly as it appears. "
                                "Include all text, headings, bullet points, numbered lists, "
                                "tables (as markdown), formulas, and describe any diagrams in detail. "
                                "Preserve the logical reading order. Do not add commentary."
                            )
                        }
                    ],
                }],
                max_tokens=4096,
            )
            text = response.choices[0].message.content.strip()
            return p_num, f"--- Page {p_num} ---\n{text}"
        except Exception as err:
            return p_num, f"--- Page {p_num} ---\n[Transcription failed: {err}]"

    with ThreadPoolExecutor(max_workers=min(len(pages_to_process), 10)) as executor:
        results = list(executor.map(transcribe_image_page, pages_to_process))

    results.sort(key=lambda x: x[0])
    pages = [text for _, text in results]

    content = "\n\n".join(pages).strip()
    print(f"  Done: {len(content):,} chars")
    return content


# ── JSON repair: attempt to salvage truncated AI responses ───────────────────
def repair_truncated_json(raw: str) -> dict | None:
    """Try to fix JSON that was cut off mid-generation by closing open structures."""
    raw = raw.strip()
    if not raw:
        return None

    # Try parsing as-is first
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Strategy: progressively try closing open braces/brackets
    # Remove any trailing partial string (unterminated quote)
    repaired = raw
    # If the last non-whitespace char is inside a string, find and close it
    if repaired.rstrip()[-1:] not in ('}', ']', '"', ','):
        # Likely mid-string — close the string
        repaired = repaired.rstrip() + '"'

    # Count open vs closed braces and brackets
    open_braces   = repaired.count('{') - repaired.count('}')
    open_brackets = repaired.count('[') - repaired.count(']')

    # Remove trailing comma if present
    repaired = repaired.rstrip()
    if repaired.endswith(','):
        repaired = repaired[:-1]

    # Close any open structures
    repaired += ']' * max(0, open_brackets) + '}' * max(0, open_braces)

    try:
        parsed = json.loads(repaired)
        print(f"  [REPAIR] Successfully repaired truncated JSON")
        return parsed
    except json.JSONDecodeError:
        return None


# ── AI: generate MCQ questions via Cerebras ─────────────────────────────────────
def generate_questions_with_ai(
    knowledge_context: str,
    topics: list[str],
    challenge: str,
    question_count: int,
    client: OpenAI,
    model: str,
    existing_questions: list[str] = None,
    template_questions: list[dict] = None,
) -> list[dict]:

    difficulty_desc = DIFFICULTY_MAP.get(challenge, f"{challenge} difficulty")

    system_prompt = """You are an expert exam question paper creator for aptitude and academic exams, specializing in UGC NET formats.
Generate high-quality questions based ONLY on the provided study material. 

STRICT RULES:
1. Generate EXACTLY the number of questions requested — no more, no less.
2. Distribute questions proportionally across all topics.
3. Return ONLY valid JSON — no markdown, no extra text.
4. Standalone Questions: NEVER mention terms like "according to the study material", "given definitions", "notes", "document", "provided text", or "material". Write them as standard, standalone exam questions.
5. Generate a balanced mix of the following 5 question types (approximately 20% of each type):
   - "mcq" (Multiple Choice Question, single correct option A/B/C/D)
   - "msq" (Multiple Select Question, one or more correct options from A/B/C/D, e.g. "A,C")
   - "fitb" (Fill in the Blanks, question text must contain "_____" and user types the answer)
   - "assertion_reason" (Two statements: Assertion (A) and Reason (R), with standard option keys A/B/C/D)
   - "matching" (Match List I numbered 1, 2, 3, 4 with List II numbered I, II, III, IV, with option keys A/B/C/D representing pairing codes)

6. Provide clear, detailed explanations for the correct answer to help students learn.

OUTPUT FORMAT (return this exact structure):
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "topic": "topic name here",
      "question": "Which of the following is correct?",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correct_answer": "A",
      "explanation": "Detailed explanation here"
    },
    {
      "id": 2,
      "type": "msq",
      "topic": "topic name here",
      "question": "Which of the following are properties of X? (Select all that apply)",
      "options": {
        "A": "Property A",
        "B": "Property B",
        "C": "Property C",
        "D": "Property D"
      },
      "correct_answer": "A,C",
      "explanation": "Detailed explanation here"
    },
    {
      "id": 3,
      "type": "fitb",
      "topic": "topic name here",
      "question": "The processor register that holds the address of the next instruction is the _____.",
      "correct_answer": "Program Counter",
      "explanation": "Detailed explanation here"
    },
    {
      "id": 4,
      "type": "assertion_reason",
      "topic": "topic name here",
      "assertion": "The clock rate of CPU is not the only metric for its performance.",
      "reason": "Instruction pipeline latency and memory hierarchy affect execution times.",
      "options": {
        "A": "Both (A) and (R) are true and (R) is the correct explanation of (A)",
        "B": "Both (A) and (R) are true but (R) is not the correct explanation of (A)",
        "C": "(A) is true but (R) is false",
        "D": "(A) is false but (R) is true"
      },
      "correct_answer": "A",
      "explanation": "Detailed explanation here"
    },
    {
      "id": 5,
      "type": "matching",
      "topic": "topic name here",
      "question": "Match the protocols in List I with their default port numbers in List II:",
      "list_i": {
        "1": "HTTP",
        "2": "HTTPS",
        "3": "FTP",
        "4": "SMTP"
      },
      "list_ii": {
        "I": "21",
        "II": "25",
        "III": "80",
        "IV": "443"
      },
      "options": {
        "A": "1-III, 2-IV, 3-I, 4-II",
        "B": "1-I, 2-II, 3-III, 4-IV",
        "C": "1-IV, 2-III, 3-II, 4-I",
        "D": "1-III, 2-I, 3-IV, 4-II"
      },
      "correct_answer": "A",
      "explanation": "Detailed explanation here"
    }
  ]
}"""

    user_prompt = (
        f"Generate exactly {question_count} questions of mixed types (MCQ, MSQ, FITB, Assertion-Reason, Matching).\n"
        f"Difficulty: {difficulty_desc}\n"
        f"Topics: {', '.join(topics)}\n\n"
    )
    if existing_questions:
        user_prompt += "STRICT RULE: Do NOT generate questions identical or similar to the following existing questions:\n"
        for eq in existing_questions:
            user_prompt += f"- {eq}\n"
        user_prompt += "\n"

    if template_questions:
        user_prompt += "EXAM QUESTION STYLE TEMPLATES (Analyze the style, formatting, complexity and depth of these questions and match them for the questions you generate):\n"
        for idx, q in enumerate(template_questions, 1):
            user_prompt += f"Template Question {idx}:\n"
            user_prompt += f"Question Text: {q.get('question_text') or q.get('question')}\n"
            opts = q.get("options")
            if opts:
                user_prompt += f"Options: {json.dumps(opts)}\n"
            user_prompt += f"Correct Answer: {q.get('answer_key') or q.get('correct_answer')}\n"
            user_prompt += f"Explanation: {q.get('solution') or q.get('explanation')}\n\n"
        user_prompt += "\n"

    user_prompt += (
        f"STUDY MATERIAL:\n{knowledge_context}\n\n"
        f"Return exactly {question_count} questions in the specified JSON format."
    )

    MAX_ATTEMPTS = 2

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"  [Attempt {attempt}/{MAX_ATTEMPTS}] Sending to AI ({model}) — "
              f"{question_count} questions @ {difficulty_desc}...")

        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt},
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
                timeout=45.0,
            )
        except Exception as e:
            print(f"  [Attempt {attempt}] API call failed: {e}")
            if attempt == MAX_ATTEMPTS:
                raise HTTPException(status_code=500, detail=f"AI API call failed: {str(e)}")
            continue

        raw = response.choices[0].message.content

        # Check if the response was truncated (finish_reason != "stop")
        finish_reason = getattr(response.choices[0], "finish_reason", "stop")
        if finish_reason == "length":
            print(f"  [Attempt {attempt}] Response truncated (finish_reason=length)")

        # Try parsing the raw JSON
        try:
            parsed = json.loads(raw)
            questions = parsed.get("questions", [])
            print(f"  Generated {len(questions)} questions.")
            return _shuffle_options_for_questions(questions)
        except json.JSONDecodeError as parse_err:
            print(f"  [Attempt {attempt}] JSON parse failed: {parse_err}")

            # Try to repair truncated JSON
            repaired = repair_truncated_json(raw)
            if repaired:
                questions = repaired.get("questions", [])
                if questions:
                    print(f"  [REPAIR] Salvaged {len(questions)} questions from truncated response.")
                    return _shuffle_options_for_questions(questions)

            # If this was the last attempt, fail
            if attempt == MAX_ATTEMPTS:
                raise HTTPException(
                    status_code=500,
                    detail=f"AI returned invalid JSON after {MAX_ATTEMPTS} attempts: {str(parse_err)}"
                )
            print(f"  Retrying...")


def fix_statement_options(questions: list[dict]) -> list[dict]:
    for q in questions:
        opts = q.get("options")
        if not opts or not isinstance(opts, dict):
            continue
        
        q_text = q.get("question", "").lower()
        is_statement = "statement i" in q_text or "statement (i)" in q_text or ("statement (" in q_text and "statement ii" in q_text) or ("statement (0)" in q_text)
        
        has_truncated_opts = False
        for val in opts.values():
            v_clean = str(val).strip().lower()
            if v_clean in ["both statement", "statement", "both statement i", "statement i", "statement is incorrect but statement ii is correct"]:
                has_truncated_opts = True
                break
                
        if is_statement or has_truncated_opts:
            print(f"  [REPAIR] Fixing statement options for question: '{q.get('question')[:50]}...'")
            new_opts = {}
            for k, v in opts.items():
                v_lower = str(v).strip().lower()
                
                if "both statement" in v_lower and ("true" in v_lower or "correct" in v_lower or "are true" in v_lower or "are correct" in v_lower or v_lower == "both statement"):
                    if k == "A" or "correct" in v_lower or "true" in v_lower:
                        new_opts[k] = "Both Statement I and Statement II are correct"
                    else:
                        new_opts[k] = "Both Statement I and Statement II are incorrect"
                elif "both statement" in v_lower and ("false" in v_lower or "incorrect" in v_lower or "are false" in v_lower or "are incorrect" in v_lower):
                    new_opts[k] = "Both Statement I and Statement II are incorrect"
                elif "statement i is correct" in v_lower or "statement i is true" in v_lower or "statement is true but statement ii is false" in v_lower or v_lower == "statement" or (v_lower.startswith("statement") and "ii is incorrect" in v_lower) or (v_lower.startswith("statement") and "ii is false" in v_lower):
                    if k == "C" or "ii is incorrect" in v_lower or "ii is false" in v_lower:
                        new_opts[k] = "Statement I is correct but Statement II is incorrect"
                    else:
                        new_opts[k] = "Statement I is incorrect but Statement II is correct"
                elif "statement i is incorrect" in v_lower or "statement i is false" in v_lower or "statement is incorrect but statement ii is correct" in v_lower or "statement is false but statement ii is true" in v_lower or (v_lower.startswith("statement") and "ii is correct" in v_lower) or (v_lower.startswith("statement") and "ii is true" in v_lower):
                    new_opts[k] = "Statement I is incorrect but Statement II is correct"
                else:
                    if k == "A":
                        new_opts[k] = "Both Statement I and Statement II are correct"
                    elif k == "B":
                        new_opts[k] = "Both Statement I and Statement II are incorrect"
                    elif k == "C":
                        new_opts[k] = "Statement I is correct but Statement II is incorrect"
                    elif k == "D":
                        new_opts[k] = "Statement I is incorrect but Statement II is correct"
            
            if "A" not in new_opts or new_opts["A"] == "": new_opts["A"] = "Both Statement I and Statement II are correct"
            if "B" not in new_opts or new_opts["B"] == "": new_opts["B"] = "Both Statement I and Statement II are incorrect"
            if "C" not in new_opts or new_opts["C"] == "": new_opts["C"] = "Statement I is correct but Statement II is incorrect"
            if "D" not in new_opts or new_opts["D"] == "": new_opts["D"] = "Statement I is incorrect but Statement II is correct"
            
            q["options"] = new_opts
    return questions


def _shuffle_options_for_questions(questions: list[dict]) -> list[dict]:
    """Shuffles the options for each question and updates correct_answer accordingly."""
    questions = fix_statement_options(questions)
    option_keys = ["A", "B", "C", "D", "E", "F", "G", "H"]
    for q in questions:
        q_type = q.get("type", "mcq")
        if q_type == "fitb" or q_type == "assertion_reason":
            continue

        options = q.get("options")
        correct_answer_key = q.get("correct_answer")

        if not options or not correct_answer_key:
            continue

        if q_type == "msq":
            # correct_answer_key is comma-separated e.g. "A,C"
            correct_keys = [k.strip() for k in correct_answer_key.split(",") if k.strip()]
            correct_texts = [options[k] for k in correct_keys if k in options]

            # Shuffle all options
            option_values = list(options.values())
            random.shuffle(option_values)

            new_options = {}
            for idx, val in enumerate(option_values):
                if idx < len(option_keys):
                    new_options[option_keys[idx]] = val

            new_correct_keys = []
            for k, v in new_options.items():
                if v in correct_texts:
                    new_correct_keys.append(k)

            new_correct_keys.sort()
            q["options"] = new_options
            q["correct_answer"] = ",".join(new_correct_keys)

        else: # MCQ or Matching
            if correct_answer_key not in options:
                continue
            correct_text = options[correct_answer_key]
            option_values = list(options.values())
            random.shuffle(option_values)

            new_options = {}
            for idx, val in enumerate(option_values):
                if idx < len(option_keys):
                    new_options[option_keys[idx]] = val

            new_correct_key = None
            for k, v in new_options.items():
                if v == correct_text:
                    new_correct_key = k
                    break

            q["options"] = new_options
            q["correct_answer"] = new_correct_key

    # Finally, shuffle the order of the questions themselves so topics are mixed
    random.shuffle(questions)
    return questions



def get_topic_content_text(topic: dict) -> str:
    topic_id = topic.get("id")
    topic_name = topic.get("name")
    notes_url = topic.get("notes_url")
    
    # 1. Try to fetch from topic_content database table first
    try:
        res = supabase.table("topic_content").select("content").eq("topic_id", topic_id).execute()
        if res.data and len(res.data) > 0:
            content = res.data[0].get("content", "")
            if content.strip():
                print(f"  [DB CACHE HIT] Retrieved text content directly from database for: {topic_name}")
                return content
    except Exception as e:
        print(f"  [DB CACHE MISS/ERR] Could not fetch from topic_content table for {topic_name}: {e}")
        
    # 2. Fall back to downloading PDF and transcribing via Groq Vision OCR
    print(f"  [DB CACHE MISS] Falling back to sequential PDF vision OCR transcription for: {topic_name}")
    return download_pdf_text(notes_url, topic_name)


def fetch_cached_questions_for_topics(topic_ids: list[str], challenge: str) -> list[dict]:
    if not topic_ids:
        return []
    all_questions = []
    for topic_id in topic_ids:
        try:
            res = supabase.table("generated_questions").select("*").eq("topic_id", topic_id).eq("challenge", challenge).execute()
            if res.data:
                all_questions.extend(res.data)
        except Exception as e:
            print(f"  [WARN] Failed to fetch cached questions for topic {topic_id}: {e}")
    return all_questions


def fetch_template_questions(topic_ids: list[str]) -> list[dict]:
    # Fetch template questions from generated_questions table only
    try:
        res = supabase.table("generated_questions").select("*").in_("topic_id", topic_ids).execute()
        if res.data:
            random.shuffle(res.data)
            return res.data[:10]
    except Exception as e:
        print(f"  [WARN] Failed to fetch template generated questions: {e}")
        
    return []


def cache_generated_questions(questions: list[dict], topic_name_to_id: dict, challenge: str):
    insert_data = []
    for q in questions:
        topic_name = q.get("topic")
        topic_id = topic_name_to_id.get(topic_name)
        if not topic_id and topic_name_to_id:
            # Fallback: check case-insensitive or partial match
            for name, tid in topic_name_to_id.items():
                if name.lower() in str(topic_name).lower() or str(topic_name).lower() in name.lower():
                    topic_id = tid
                    break
            else:
                # Absolute fallback: first topic ID
                topic_id = list(topic_name_to_id.values())[0]
        if not topic_id:
            continue
        insert_data.append({
            "topic_id": topic_id,
            "question_text": q["question"],
            "options": q.get("options") or {},
            "correct_answer": q["correct_answer"],
            "explanation": q.get("explanation"),
            "question_type": q.get("type", "mcq"),
            "challenge": challenge
        })
    if insert_data:
        try:
            supabase.table("generated_questions").insert(insert_data).execute()
            print(f"  [DB CACHE] Successfully saved {len(insert_data)} generated questions to database.")
        except Exception as e:
            print(f"  [WARN] Failed to save generated questions to database: {e}")


# ── Main endpoint ─────────────────────────────────────────────────────────────
@router.post("/generate-paper")
def generate_paper(request: PaperRequest):
    if not request.include_notes:
        raise HTTPException(
            status_code=400,
            detail="Notes must be selected."
        )

    # 1. Fetch matching topic records
    topic_records = (
        supabase
        .table("topics")
        .select("id,name,notes_url")
        .in_("name", request.topics)
        .execute()
    )
    if not topic_records.data:
        raise HTTPException(status_code=404, detail="No matching topics found")

    print(f"\n=== Paper Generation Started ===")
    print(f"Topics         : {request.topics}")
    print(f"Challenge      : {request.challenge}")
    print(f"Questions      : {request.question_count}")
    print(f"Include Notes  : {request.include_notes}")

    topic_ids = [t["id"] for t in topic_records.data]
    topic_id_to_name = {t["id"]: t["name"] for t in topic_records.data}
    topic_name_to_id = {t["name"]: t["id"] for t in topic_records.data}
    num_topics = len(topic_records.data)

    # RULE 1: If num_topics > 5, reuse questions directly from cache without LLM if there are enough!
    if num_topics > 5:
        print(f"  [Routing Rule] More than 5 topics selected ({num_topics}). Reusing cached questions directly...")
        
        # Fetch cached generated questions
        raw_cached = fetch_cached_questions_for_topics(topic_ids, request.challenge)
        pool = []
        for q in raw_cached:
            pool.append({
                "topic":          topic_id_to_name.get(q.get("topic_id"), "General Topic"),
                "question":       q["question_text"],
                "options":        q["options"],
                "correct_answer": q["correct_answer"],
                "explanation":    q.get("explanation") or "No solution explanation available.",
                "type":           q.get("question_type", "mcq")
            })
            
        # If we have enough questions, sample and return
        if len(pool) >= request.question_count:
            random.shuffle(pool)
            selected = pool[:request.question_count]
            for idx, q in enumerate(selected, 1):
                q["id"] = idx
            selected = _shuffle_options_for_questions(selected)
            print(f"  [DB DIRECT] Returned {len(selected)} questions directly from cache pool.")
            return {
                "status":           "success",
                "topics_loaded":    num_topics,
                "topics":           [t["name"] for t in topic_records.data],
                "failed_topics":    [],
                "challenge":        request.challenge,
                "question_count":   len(selected),
                "knowledge_chars":  0,
                "questions":        selected,
            }

    # Fetch previously generated questions from cache
    cached_questions = []
    if request.include_generated_questions:
        raw_cached = fetch_cached_questions_for_topics(topic_ids, request.challenge)
        for idx, q in enumerate(raw_cached, 1):
            cached_questions.append({
                "id":             idx,
                "topic":          topic_id_to_name.get(q.get("topic_id"), "General Topic"),
                "question":       q["question_text"],
                "options":        q["options"],
                "correct_answer": q["correct_answer"],
                "explanation":    q.get("explanation") or "No solution explanation available.",
                "type":           q.get("question_type", "mcq")
            })

    # If cache has enough questions, return directly!
    if request.include_generated_questions and len(cached_questions) >= request.question_count:
        random.shuffle(cached_questions)
        selected_questions = cached_questions[:request.question_count]
        # Re-index
        for idx, q in enumerate(selected_questions, 1):
            q["id"] = idx
        selected_questions = _shuffle_options_for_questions(selected_questions)
        
        print(f"  [DB CACHE FULL HIT] Bypassed AI entirely. Returned {len(selected_questions)} cached questions.")
        return {
            "status":           "success",
            "topics_loaded":    num_topics,
            "topics":           [t["name"] for t in topic_records.data],
            "failed_topics":    [],
            "challenge":        request.challenge,
            "question_count":   len(selected_questions),
            "knowledge_chars":  0,
            "questions":        selected_questions,
        }

    # Otherwise, calculate how many remaining questions to generate
    remaining_count = request.question_count
    if request.include_generated_questions:
        remaining_count -= len(cached_questions)
        print(f"  [DB CACHE PARTIAL HIT] Found {len(cached_questions)} cached questions. Remaining to generate: {remaining_count}")

    # Helper list of existing questions to pass to prompt
    existing_question_texts = [q["question"] for q in cached_questions]

    # RULE 2: Fetch template questions if 3 <= num_topics <= 5
    template_questions = None
    if 3 <= num_topics <= 5:
        print(f"  [Routing Rule] 3 <= num_topics <= 5 ({num_topics}). Fetching 10 template questions...")
        template_questions = fetch_template_questions(topic_ids)

    # Generate questions from Notes
    print("  Routing: Notes Generation Mode")
    topic_texts = []
    failed_topics = []

    for topic in topic_records.data:
        try:
            text = get_topic_content_text(topic)
            topic_texts.append({
                "name":  topic["name"],
                "text":  text,
                "chars": len(text),
            })
        except Exception as e:
            print(f"    [WARN] Skipping note '{topic['name']}': {e}")
            failed_topics.append(topic["name"])

    if not topic_texts:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve notes content for any selected topic."
        )

    # Merge into knowledge_context with no RAG rule restrictions
    max_chars_total = 15000
    chars_per_topic = max(3000, max_chars_total // len(topic_texts))

    knowledge_context = ""
    for item in topic_texts:
        topic_text = item["text"].strip()
        if len(topic_text) > chars_per_topic:
            topic_text = topic_text[:chars_per_topic] + "\n... [Content truncated to stay within rate limits] ..."
        knowledge_context += f"\n\n{'='*60}\nTOPIC: {item['name']}\n{'='*60}\n\n"
        knowledge_context += topic_text
    knowledge_context = knowledge_context.strip()

    questions = []
    if remaining_count > 0:
        print(f"  Knowledge Context ready ({len(knowledge_context):,} chars). Calling LLM...")
        cerebras_client = get_cerebras_client()
        questions = generate_questions_with_ai(
            knowledge_context = knowledge_context,
            topics            = [t["name"] for t in topic_texts],
            challenge         = request.challenge,
            question_count    = remaining_count,
            client            = cerebras_client,
            model             = CEREBRAS_TEXT_MODEL,
            existing_questions = existing_question_texts,
            template_questions = template_questions,
        )

        if questions:
            cache_generated_questions(questions, topic_name_to_id, request.challenge)

    combined_questions = cached_questions + questions
    for idx, q in enumerate(combined_questions, 1):
        q["id"] = idx

    combined_questions = _shuffle_options_for_questions(combined_questions)

    return {
        "status":           "success",
        "topics_loaded":    len(topic_texts),
        "topics":           [t["name"] for t in topic_texts],
        "failed_topics":    failed_topics,
        "challenge":        request.challenge,
        "question_count":   len(combined_questions),
        "knowledge_chars":  len(knowledge_context),
        "questions":        combined_questions,
    }