from pydantic import BaseModel

class PaperRequest(BaseModel):
    subject_id: str
    topics: list[str]
    challenge: str
    question_count: int
    include_notes: bool = True
    include_pyqs: bool = True