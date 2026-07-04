from pydantic import BaseModel

class MangaGenerateRequest(BaseModel):
    topic: str
    notes: str = ""
