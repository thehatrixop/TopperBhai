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

    from concurrent.futures import ThreadPoolExecutor

    client = get_groq_client()
    print(f"  Transcribing {doc.page_count} page(s) in parallel via Groq Vision...")

    def transcribe_single_page(args):
        p_num, p = args
        try:
            p_text = transcribe_page_with_vision(p, p_num, client)
            return p_num, f"--- Page {p_num} ---\n{p_text}"
        except Exception as err:
            return p_num, f"--- Page {p_num} ---\n[Transcription failed: {err}]"

    pages_to_process = list(enumerate(doc, start=1))
    with ThreadPoolExecutor(max_workers=min(doc.page_count, 10)) as executor:
        results = list(executor.map(transcribe_single_page, pages_to_process))

    results.sort(key=lambda x: x[0])
    pages = [text for _, text in results]

    doc.close()
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


def _shuffle_options_for_questions(questions: list[dict]) -> list[dict]:
    """Shuffles the options for each question and updates correct_answer accordingly."""
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



# Helper to fetch PYQs from the database
def fetch_pyqs_for_topics(topic_ids: list[str], min_year: int = None, limit_per_topic: int = None) -> list[dict]:
    if not topic_ids:
        return []
    all_pyqs = []
    for topic_id in topic_ids:
        query = supabase.table("pyqs").select("*").eq("topic_id", topic_id)
        if min_year is not None:
            query = query.gte("year", min_year)
        res = query.execute()
        topic_pyqs = res.data or []
        if limit_per_topic is not None and len(topic_pyqs) > limit_per_topic:
            random.shuffle(topic_pyqs)
            topic_pyqs = topic_pyqs[:limit_per_topic]
        all_pyqs.extend(topic_pyqs)
    return all_pyqs

# Helper to format PYQs as context string
def format_pyqs_for_context(pyqs: list[dict], topic_id_to_name: dict) -> str:
    lines = []
    for idx, q in enumerate(pyqs, 1):
        topic_name = topic_id_to_name.get(q.get("topic_id"), "General Topic")
        lines.append(f"PYQ Question {idx} [Topic: {topic_name}] [Year: {q.get('year', 'N/A')}]: {q.get('question_text')}")
        opts = q.get("options")
        if opts and isinstance(opts, dict):
            for k, v in opts.items():
                lines.append(f"  {k}: {v}")
        lines.append(f"Correct Answer Key: {q.get('answer_key')}")
        if q.get("solution"):
            lines.append(f"Explanation/Solution: {q.get('solution')}")
        lines.append("")
    return "\n".join(lines).strip()


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


# ── Main endpoint ─────────────────────────────────────────────────────────────
@router.post("/generate-paper")
def generate_paper(request: PaperRequest):
    if not request.include_notes and not request.include_pyqs:
        raise HTTPException(
            status_code=400,
            detail="At least one study source (Notes or PYQs) must be selected."
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
    print(f"Include PYQs   : {request.include_pyqs}")

    topic_ids = [t["id"] for t in topic_records.data]
    topic_id_to_name = {t["id"]: t["name"] for t in topic_records.data}
    num_topics = len(topic_records.data)
    
    import datetime
    current_year = datetime.date.today().year

    # Option A: Only Notes (Notes Checked, PYQs Unchecked)
    if request.include_notes and not request.include_pyqs:
        print("  Routing: Only Notes mode")
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
                print(f"    [WARN] Skipping '{topic['name']}': {e}")
                failed_topics.append(topic["name"])

        if not topic_texts:
            raise HTTPException(
                status_code=500,
                detail="Could not retrieve notes content for any selected topic."
            )

        # Merge into knowledge_context with no RAG rule restrictions
        knowledge_context = ""
        for item in topic_texts:
            knowledge_context += f"\n\n{'='*60}\nTOPIC: {item['name']}\n{'='*60}\n\n"
            knowledge_context += item["text"]
        knowledge_context = knowledge_context.strip()

        print(f"  Knowledge Context ready ({len(knowledge_context):,} chars). Calling LLM...")
        cerebras_client = get_cerebras_client()
        questions = generate_questions_with_ai(
            knowledge_context = knowledge_context,
            topics            = [t["name"] for t in topic_texts],
            challenge         = request.challenge,
            question_count    = request.question_count,
            client            = cerebras_client,
            model             = CEREBRAS_TEXT_MODEL,
        )

        return {
            "status":           "success",
            "topics_loaded":    len(topic_texts),
            "topics":           [t["name"] for t in topic_texts],
            "failed_topics":    failed_topics,
            "challenge":        request.challenge,
            "question_count":   len(questions),
            "knowledge_chars":  len(knowledge_context),
            "questions":        questions,
        }

    # Option B: Only PYQs (Notes Unchecked, PYQs Checked)
    elif not request.include_notes and request.include_pyqs:
        print("  Routing: Only PYQs mode")
        
        # Branch B.1: <= 3 topics -> use PYQ of last 5 years
        if num_topics <= 3:
            min_year = current_year - 5
            print(f"    Topics count <= 3 ({num_topics}). Fetching PYQs since {min_year}...")
            pyqs = fetch_pyqs_for_topics(topic_ids, min_year=min_year)
            if not pyqs:
                raise HTTPException(
                    status_code=400,
                    detail=f"No PYQs from the last 5 years (since {min_year}) found in database. Please seed the database."
                )
            
            knowledge_context = format_pyqs_for_context(pyqs, topic_id_to_name)
            print(f"    Knowledge Context ready ({len(knowledge_context):,} chars). Calling LLM...")
            cerebras_client = get_cerebras_client()
            questions = generate_questions_with_ai(
                knowledge_context = knowledge_context,
                topics            = [t["name"] for t in topic_records.data],
                challenge         = request.challenge,
                question_count    = request.question_count,
                client            = cerebras_client,
                model             = CEREBRAS_TEXT_MODEL,
            )
            return {
                "status":           "success",
                "topics_loaded":    num_topics,
                "topics":           [t["name"] for t in topic_records.data],
                "failed_topics":    [],
                "challenge":        request.challenge,
                "question_count":   len(questions),
                "knowledge_chars":  len(knowledge_context),
                "questions":        questions,
            }

        # Branch B.2: 4 to 5 topics -> use PYQ of last 3 years
        elif num_topics <= 5:
            min_year = current_year - 3
            print(f"    Topics count >3 and <=5 ({num_topics}). Fetching PYQs since {min_year}...")
            pyqs = fetch_pyqs_for_topics(topic_ids, min_year=min_year)
            if not pyqs:
                raise HTTPException(
                    status_code=400,
                    detail=f"No PYQs from the last 3 years (since {min_year}) found in database. Please seed the database."
                )
            
            knowledge_context = format_pyqs_for_context(pyqs, topic_id_to_name)
            print(f"    Knowledge Context ready ({len(knowledge_context):,} chars). Calling LLM...")
            cerebras_client = get_cerebras_client()
            questions = generate_questions_with_ai(
                knowledge_context = knowledge_context,
                topics            = [t["name"] for t in topic_records.data],
                challenge         = request.challenge,
                question_count    = request.question_count,
                client            = cerebras_client,
                model             = CEREBRAS_TEXT_MODEL,
            )
            return {
                "status":           "success",
                "topics_loaded":    num_topics,
                "topics":           [t["name"] for t in topic_records.data],
                "failed_topics":    [],
                "challenge":        request.challenge,
                "question_count":   len(questions),
                "knowledge_chars":  len(knowledge_context),
                "questions":        questions,
            }

        # Branch B.3: > 5 topics -> complete PYQ data with script-based random selection (No AI)
        else:
            print(f"    Topics count > 5 ({num_topics}). Selecting randomly from DB...")
            pyqs = fetch_pyqs_for_topics(topic_ids)
            if not pyqs:
                raise HTTPException(
                    status_code=400,
                    detail="No PYQs found in the database. Please seed the database."
                )

            # Sample question_count questions
            sampled_pyqs = pyqs
            if len(sampled_pyqs) > request.question_count:
                random.shuffle(sampled_pyqs)
                sampled_pyqs = sampled_pyqs[:request.question_count]

            questions = []
            for idx, q in enumerate(sampled_pyqs, 1):
                questions.append({
                    "id":             idx,
                    "topic":          topic_id_to_name.get(q.get("topic_id"), "General Topic"),
                    "question":       q["question_text"],
                    "options":        q["options"],
                    "correct_answer": q["answer_key"],
                    "explanation":    q.get("solution") or "No solution explanation available."
                })

            # Shuffle options and question order
            questions = _shuffle_options_for_questions(questions)

            print(f"    Bypassed AI. Selected {len(questions)} PYQ questions directly from database.")
            return {
                "status":           "success",
                "topics_loaded":    num_topics,
                "topics":           [t["name"] for t in topic_records.data],
                "failed_topics":    [],
                "challenge":        request.challenge,
                "question_count":   len(questions),
                "knowledge_chars":  0,
                "questions":        questions,
            }

    # Option C: Notes + PYQs (Both Checked)
    else:
        print("  Routing: Notes + PYQs mode")
        
        # Determine number of PYQ questions to select per topic
        if num_topics <= 3:
            limit_per_topic = 50
        elif num_topics <= 5:
            limit_per_topic = 30
        else:
            limit_per_topic = 10

        print(f"    Topics count = {num_topics}. Sampling {limit_per_topic} PYQs per topic...")
        
        # 1. Retrieve notes
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

        # 2. Retrieve PYQs
        pyqs = fetch_pyqs_for_topics(topic_ids, limit_per_topic=limit_per_topic)

        # 3. Format context
        knowledge_context = ""
        if topic_texts:
            knowledge_context += "=== TOPIC STUDY NOTES ===\n"
            for item in topic_texts:
                knowledge_context += f"\nTOPIC: {item['name']}\n{item['text']}\n"
        
        if pyqs:
            knowledge_context += "\n\n=== SAMPLE PREVIOUS YEAR QUESTIONS (PYQs) FOR CONTEXT ===\n"
            knowledge_context += format_pyqs_for_context(pyqs, topic_id_to_name)

        knowledge_context = knowledge_context.strip()

        print(f"    Combined Knowledge Context ready ({len(knowledge_context):,} chars). Calling LLM...")
        cerebras_client = get_cerebras_client()
        questions = generate_questions_with_ai(
            knowledge_context = knowledge_context,
            topics            = [t["name"] for t in topic_records.data],
            challenge         = request.challenge,
            question_count    = request.question_count,
            client            = cerebras_client,
            model             = CEREBRAS_TEXT_MODEL,
        )

        return {
            "status":           "success",
            "topics_loaded":    len(topic_texts),
            "topics":           [t["name"] for t in topic_records.data],
            "failed_topics":    failed_topics,
            "challenge":        request.challenge,
            "question_count":   len(questions),
            "knowledge_chars":  len(knowledge_context),
            "questions":        questions,
        }