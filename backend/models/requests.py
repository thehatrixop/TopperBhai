from pydantic import BaseModel
from typing import List, Dict, Optional

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    question: Optional[str] = None
    options: Optional[Dict[str, str]] = None
    correct_answer: str
    selected_answer: str
    explanation: str
    message: str
    history: List[ChatMessage] = []
    type: Optional[str] = None
    assertion: Optional[str] = None
    reason: Optional[str] = None
    list_i: Optional[Dict[str, str]] = None
    list_ii: Optional[Dict[str, str]] = None


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

class LetterFieldsRequest(BaseModel):
    purpose: str

class LetterGenerateRequest(BaseModel):
    purpose: str
    fields_data: dict

class MangaGenerateRequest(BaseModel):
    topic: str
    notes: str = ""

class PaperRequest(BaseModel):
    subject_id: str
    topics: List[str]
    challenge: str
    question_count: int
    include_notes: bool = True
    include_generated_questions: bool = True

class VideoRecommendRequest(BaseModel):
    chapter_name: str
    subject: Optional[str] = None
