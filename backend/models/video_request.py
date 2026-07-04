from pydantic import BaseModel
from typing import Optional

class VideoRecommendRequest(BaseModel):
    chapter_name: str
    subject: Optional[str] = None
