from pydantic import BaseModel
from typing import List, Dict

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    question: str
    options: Dict[str, str]
    correct_answer: str
    selected_answer: str
    explanation: str
    message: str
    history: List[ChatMessage] = []
