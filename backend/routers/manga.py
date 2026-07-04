from fastapi import APIRouter, HTTPException
import os
import json
from openai import OpenAI
from models.manga_request import MangaGenerateRequest

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

@router.post("/manga/generate-guide")
def generate_manga_guide(request: MangaGenerateRequest):
    client = get_cerebras_client()
    
    system_prompt = """You are "TopperBhai Manga Storyboard Creator", a master educational designer who translates dry technical engineering and computer science concepts into memorable, highly engaging manga stories.

Your goal is to personify technical components as characters (e.g., in TCP handshake: "Packet-Kun" is a fast runner carrying a flag, "Server-Sensei" is a calm security guard at the gate; in databases: "Query-Chan" searching through indexing files; in OS: "CPU-Sama" scheduling impatient "Process-Chans").

Create a structured 3-5 panel manga script explaining the requested topic. Incorporate details from any provided notes if available.

You MUST return your output strictly in JSON format with the following keys (ensure no extra text, markdown wrappers, or explanation outside the JSON):
{
  "title": "A catchy manga-style chapter name (e.g., 'Chapter 1: The SYN-ACK Alliance!')",
  "topic": "The topic name",
  "panels": [
    {
      "panel_number": 1,
      "scene_description": "Describe the visual styling, speed lines, action, and background environment (e.g., 'High-speed data cables glowing under binary pulses. Packet-Kun charges forward with a glowing SYN banner.')",
      "narration": "A short, clear narrator textbox explaining the underlying computer science concept happening in this step.",
      "visual_intensity": "one of: rookie, power-up, ultimate, explosion (representing the action level of the panel)",
      "dialogues": [
        {
          "character": "Packet-Kun",
          "line": "I'm carrying the synchronization banner! Server-Sensei, open the gate!"
        },
        {
          "character": "Server-Sensei",
          "line": "A packet approaches! Let's see if the connection parameters match my protocols."
        }
      ]
    }
  ]
}
"""
    
    user_prompt = f"Topic: {request.topic}\nNotes/Context: {request.notes}"
    
    try:
        response = client.chat.completions.create(
            model=CEREBRAS_TEXT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
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
