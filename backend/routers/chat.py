from fastapi import APIRouter, HTTPException
from models.requests import ChatRequest
from db.cerebras_client import get_cerebras_client, CEREBRAS_TEXT_MODEL

router = APIRouter()

@router.post("/chat/analyze-mistake")
def analyze_mistake(request: ChatRequest):
    client = get_cerebras_client()
    
    # Format the question context based on the type
    q_type = request.type or "mcq"
    
    question_context = ""
    if q_type == "assertion_reason":
        question_context = (
            f"- TYPE: Assertion-Reason\n"
            f"- ASSERTION (A): {request.assertion}\n"
            f"- REASON (R): {request.reason}\n"
        )
        if request.options:
            opts_formatted = "\n".join([f"  - ({k}) {v}" for k, v in request.options.items()])
            question_context += f"- OPTIONS:\n{opts_formatted}\n"
    elif q_type == "matching":
        list_i_formatted = "\n".join([f"  {k}. {v}" for k, v in request.list_i.items()]) if request.list_i else ""
        list_ii_formatted = "\n".join([f"  {k}. {v}" for k, v in request.list_ii.items()]) if request.list_ii else ""
        opts_formatted = "\n".join([f"  - ({k}) {v}" for k, v in request.options.items()]) if request.options else ""
        question_context = (
            f"- TYPE: Matching Lists\n"
            f"- QUESTION: {request.question}\n"
            f"- LIST I:\n{list_i_formatted}\n"
            f"- LIST II:\n{list_ii_formatted}\n"
            f"- OPTIONS (Pairings):\n{opts_formatted}\n"
        )
    elif q_type == "fitb":
        question_context = (
            f"- TYPE: Fill in the Blanks\n"
            f"- QUESTION: {request.question}\n"
        )
    elif q_type == "msq":
        opts_formatted = "\n".join([f"  - ({k}) {v}" for k, v in request.options.items()]) if request.options else ""
        question_context = (
            f"- TYPE: Multiple Select Question (MSQ)\n"
            f"- QUESTION: {request.question}\n"
            f"- OPTIONS:\n{opts_formatted}\n"
        )
    else: # mcq or other
        opts_formatted = "\n".join([f"  - ({k}) {v}" for k, v in request.options.items()]) if request.options else ""
        question_context = (
            f"- TYPE: Multiple Choice Question (MCQ)\n"
            f"- QUESTION: {request.question}\n"
            f"- OPTIONS:\n{opts_formatted}\n"
        )
        
    # Customize system prompt based on whether they answered correctly or not
    if request.selected_answer.strip().lower() == request.correct_answer.strip().lower():
        outcome_focus = (
            f"The student answered correctly by choosing {request.selected_answer}. "
            "Congratulate them briefly, help them solidify their understanding, or answer their questions about "
            "alternative approaches or other options."
        )
    else:
        outcome_focus = (
            f"The student chose {request.selected_answer}, which is INCORRECT. "
            f"The correct answer is {request.correct_answer}. "
            f"Explain why their choice/input is incorrect, analyze their conceptual mistake, and guide them clearly "
            f"towards the correct logic behind the correct answer."
        )
        
    system_content = f"""You are "TopperBhai AI Tutor", an encouraging, highly knowledgeable, and empathetic personal academic tutor. 
A student has generated a practice exam and is reviewing a question they answered. 

Here is the exact question context:
{question_context}
- CORRECT ANSWER: {request.correct_answer}
- STUDENT'S SELECTED ANSWER: {request.selected_answer}
- ORIGINAL EXPLANATION: {request.explanation}

Your Focus:
{outcome_focus}

Your Guidelines:
1. Keep your tone supportive, warm, and encouraging (like a friendly mentor).
2. Keep answers concise, readable, and well-structured using markdown/bullets/bolding.
3. Be clear and step-by-step. If relevant, use simpler analogies.
4. If they ask about something unrelated to this question or academic topic, politely bring them back to the subject.
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
        raise HTTPException(status_code=500, detail=f"Cerebras API call failed: {str(e)}")
