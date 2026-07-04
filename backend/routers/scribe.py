from fastapi import APIRouter, HTTPException, File, Form, UploadFile
import os
import base64
import json
from groq import Groq

router = APIRouter()

VISION_MODEL = "llama-3.2-90b-vision-preview"

_groq_client = None

def get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in .env")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

@router.post("/scribe/grade-subjective")
async def grade_subjective(
    question: str = Form(...),
    rubrics: str = Form(...),
    file: UploadFile = File(...),
    target_language: str = Form("English")
):
    # 1. Read file and encode to base64
    try:
        file_bytes = await file.read()
        file_ext = file.filename.split(".")[-1].lower()
        if file_ext not in ["png", "jpg", "jpeg", "webp"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid image format. Supported formats: PNG, JPG, JPEG, WEBP."
            )
        
        media_type = f"image/{file_ext}"
        if file_ext == "jpg":
            media_type = "image/jpeg"
            
        img_b64 = base64.b64encode(file_bytes).decode("utf-8")
        image_url = f"data:{media_type};base64,{img_b64}"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read upload file: {str(e)}")
        
    client = get_groq_client()
    
    system_prompt = f"""You are "TopperBhai Subjective Grader", an encouraging, detailed, and precise academic evaluator.
The student has submitted an image of their handwritten answer sheet, which may also contain diagrams, graphs, or flowcharts.
You are given the Question Prompt and a Grading Rubrics / Ideal Answer.

IMPORTANT: If the Grading Rubrics is set to "auto" or contains auto instructions, you must dynamically determine a standard, academic grading scheme (rubric) that is appropriate for the given Question Prompt. Break it down into logical criteria.

Your task:
1. Transcribe the student's handwritten text exactly as written. Keep the transcription in the student's original handwriting language (e.g. Hindi or English).
2. Analyze any drawn diagrams, schemas, or visual flows. Check if nodes, arrows, equations, or layers are labeled correctly and align with the requested concept.
3. Score the answer step-by-step against the marking rubrics, awarding marks for each criterion.
4. Provide actionable, supportive feedback to help the student improve their explanation, formatting, or diagram drawing.

You MUST write all diagram checks, rubric criteria names, rubric comments, and overall feedback strictly in the specified target language: {target_language}.
You MUST return your output strictly in JSON format with the following keys (ensure no extra text, markdown wrappers, or explanations outside the JSON):
{{
  "score": 7,
  "max_score": 10,
  "transcription": "exact transcription of their handwriting here",
  "diagram_check": "Detailed feedback on the diagram in {target_language}. Mention labels, layout, correctness. If no diagram is present or required, set to 'No diagram requested or drawn.'",
  "rubrics_eval": [
    {{
      "criterion": "criterion description in {target_language}",
      "score_awarded": 3,
      "max_score": 4,
      "comment": "comment in {target_language}"
    }}
  ],
  "feedback": "Encouraging overall summary of their performance in {target_language} with 2-3 specific bullet points on how to improve layout, handwriting clarity, or technical depth."
}}
"""

    rubrics_instruction = "dynamically generate standard criteria and evaluate against it" if rubrics.strip().lower() == "auto" else rubrics

    user_content = [
        {
            "type": "image_url",
            "image_url": {"url": image_url}
        },
        {
            "type": "text",
            "text": (
                f"QUESTION PROMPT:\n{question}\n\n"
                f"GRADING RUBRICS / IDEAL ANSWER:\n{rubrics_instruction}\n\n"
                f"TARGET LANGUAGE FOR EVALUATION: {target_language}\n\n"
                f"Analyze the uploaded handwritten answer image. Remember: Transcribe the handwriting exactly as written, but write all criteria descriptions, score comments, diagram evaluations, and final feedback summaries strictly in {target_language}."
            )
        }
    ]
    
    try:
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.2,
            max_tokens=2048,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content.strip()
        result = json.loads(raw_content)
        return result
    except json.JSONDecodeError as parse_err:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON: {str(parse_err)}. Raw content: {raw_content[:200]}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Groq Vision API call failed: {str(e)}"
        )
