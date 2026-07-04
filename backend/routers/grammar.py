from fastapi import APIRouter, HTTPException
import os
import json
from openai import OpenAI
from models.grammar_request import GrammarCheckRequest, GrammarChatRequest

router = APIRouter()

CEREBRAS_TEXT_MODEL = "gpt-oss-120b"
CEREBRAS_BASE_URL   = "https://api.cerebras.ai/v1"

_cerebras_client = None

def get_cerebras_client() -> OpenAI:
    global _cerebras_client
    if _cerebras_client is None:
        api_key = os.getenv("CEREBRAS_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="CEREBRAS_API_KEY not set in .env")
        _cerebras_client = OpenAI(
            api_key=api_key,
            base_url=CEREBRAS_BASE_URL,
        )
    return _cerebras_client

@router.post("/grammar/check")
def check_grammar(request: GrammarCheckRequest):
    client = get_cerebras_client()
    
    system_prompt = """You are "TopperBhai Grammar Coach", an encouraging, highly knowledgeable, and friendly English language tutor. Your goal is to help students strengthen their grammar and writing skills.

The student has provided a draft text and the intended context/purpose for this writing (e.g., leave application, formal meeting reschedule email, personal chat).

Your task:
1. Analyze the text for grammar, spelling, punctuation, styling, structure, and tone issues based on the specified context.
2. Correct the text. Keep the core meaning intact but adjust syntax, phrasing, and vocabulary as appropriate for the context.
3. Identify each specific correction made, classifying them into categories (e.g., Verb Tense, Subject-Verb Agreement, Punctuation, Word Choice, Style & Tone, Spelling) and providing a simple, encouraging educational explanation of the rule violated and why the change was made.
4. Provide general overall feedback on their writing.
5. Provide 2-3 alternative vocabulary options or phrasing suggestions to make their writing even better for the given context.

If the student's text is already perfect, return an empty array for "corrections", praise their writing in "overall_feedback", and provide 2-3 advanced stylistic suggestions in "suggestions".

You MUST return your output strictly in JSON format with the following keys:
{
  "corrected_text": "the fully corrected text",
  "overall_feedback": "a short paragraph of encouraging and constructive feedback",
  "corrections": [
    {
      "original_part": "the wrong phrase/word from original text",
      "corrected_part": "the corrected phrase/word in corrected text",
      "rule_category": "e.g., Verb Tense, Subject-Verb Agreement, Punctuation, Word Choice, Style & Tone, Spelling",
      "explanation": "clear, easy-to-understand explanation of the grammar rule and why it was changed"
    }
  ],
  "suggestions": [
    "suggestion 1",
    "suggestion 2"
  ]
}
"""
    user_prompt = f"Draft Text: {request.text}\nContext/Goal: {request.context}"
    
    try:
        response = client.chat.completions.create(
            model=CEREBRAS_TEXT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )
        
        raw_content = response.choices[0].message.content.strip()
        result = json.loads(raw_content)
        return result
    except json.JSONDecodeError as parse_err:
        raise HTTPException(
            status_code=500,
            detail=f"AI returned invalid JSON: {str(parse_err)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cerebras API call failed: {str(e)}"
        )

@router.post("/grammar/chat")
def chat_grammar(request: GrammarChatRequest):
    client = get_cerebras_client()
    
    system_content = f"""You are "TopperBhai Grammar Coach", a friendly, encouraging, and highly knowledgeable English grammar tutor.
A student is reviewing their writing draft and trying to learn from their mistakes.

Here is the context of their writing:
- INTENDED CONTEXT: {request.context}
- ORIGINAL DRAFT: {request.original_text}
- CORRECTED DRAFT: {request.corrected_text}
- GRAMMATICAL CORRECTIONS MADE:
{request.corrections_json}

Your Guidelines:
1. Act as a friendly mentor/coach. Explain grammar rules in a simple, supportive way.
2. Answer their questions about the text, the corrections, or grammar rules in general.
3. If they ask how to rephrase a sentence, offer polite or formal alternatives.
4. If they ask about something completely unrelated, gently bring them back to their writing/grammar.
5. Keep answers concise, readable, and well-structured using markdown/bullets/bolding.
"""

    messages = [{"role": "system", "content": system_content}]
    
    # Add history
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})
        
    # Add current message
    messages.append({"role": "user", "content": request.message})
    
    try:
        response = client.chat.completions.create(
            model=CEREBRAS_TEXT_MODEL,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        reply = response.choices[0].message.content.strip()
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cerebras API call failed: {str(e)}"
        )
