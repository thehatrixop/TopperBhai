import os
from fastapi import HTTPException
from openai import OpenAI

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
