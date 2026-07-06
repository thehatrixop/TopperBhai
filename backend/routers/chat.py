from fastapi import APIRouter, HTTPException
from models.requests import ChatRequest
from db.cerebras_client import get_cerebras_client, CEREBRAS_TEXT_MODEL

router = APIRouter()

@router.post("/chat/analyze-mistake")
def analyze_mistake(request: ChatRequest):
    client = get_cerebras_client()
    
    # Format options
    options_formatted = "\n".join([f"  - ({k}) {v}" for k, v in request.options.items()])
    
    # Customize system prompt based on whether they answered correctly or not
    if request.selected_answer == request.correct_answer:
        outcome_focus = (
            f"The student answered correctly by choosing option {request.selected_answer}. "
            "Congratulate them briefly, help them solidify their understanding, or answer their questions about "
            "alternative approaches or other options."
        )
    else:
        outcome_focus = (
            f"The student chose option {request.selected_answer}, which is INCORRECT. "
            f"The correct option is {request.correct_answer}. "
            f"Explain why their choice is incorrect, analyze their conceptual mistake, and guide them clearly "
            f"towards the correct logic behind option {request.correct_answer}."
        )
        
    system_content = f"""You are "TopperBhai AI Tutor", an encouraging, highly knowledgeable, and empathetic personal academic tutor. 
A student has generated a practice exam and is reviewing a question they answered. 

Here is the exact question context:
- QUESTION: {request.question}
- OPTIONS:
{options_formatted}
- CORRECT OPTION: {request.correct_answer}
- STUDENT'S SELECTED OPTION: {request.selected_answer}
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
