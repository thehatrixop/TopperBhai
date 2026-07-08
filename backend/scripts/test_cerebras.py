import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from groq import Groq

# Add parent dir to path so we can import db module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

def test():
    print("Testing Cerebras...")
    cerebras_key = os.getenv("CEREBRAS_API_KEY")
    if cerebras_key:
        try:
            from db.cerebras_client import CEREBRAS_TEXT_MODEL, CEREBRAS_BASE_URL
            print(f"Model configured: {CEREBRAS_TEXT_MODEL}")
            client = OpenAI(api_key=cerebras_key, base_url=CEREBRAS_BASE_URL)
            response = client.chat.completions.create(
                model=CEREBRAS_TEXT_MODEL,
                messages=[{"role": "user", "content": "hello"}],
                max_tokens=10
            )
            print("Cerebras Output:", response.choices[0].message.content)
        except Exception as e:
            print("Cerebras failed:", e)
            
    print("\nTesting Groq...")
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            client = Groq(api_key=groq_key)
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": "hello"}],
                max_tokens=10
            )
            print("Groq Output:", response.choices[0].message.content)
        except Exception as e:
            print("Groq failed:", e)

if __name__ == "__main__":
    test()
