from pydantic import BaseModel
from typing import List

class GrammarMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class GrammarCheckRequest(BaseModel):
    text: str
    context: str

class GrammarChatRequest(BaseModel):
    original_text: str
    corrected_text: str
    context: str
    corrections_json: str  # JSON representation of the corrections list
    message: str
    history: List[GrammarMessage] = []
