import sys
import os
from pathlib import Path
import json
import time
from groq import Groq
from openai import OpenAI

# Add parent dir to path so we can import db module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.supabase_client import supabase

def generate_notes_with_ai(topic_name: str) -> str:
    """Generates comprehensive revision study notes for a given topic using Groq or Cerebras."""
    system_prompt = f"""You are "TopperBhai Syllabus Architect", an elite academic professor in Computer Science.
Generate a comprehensive, high-quality, professional markdown revision study notes document for the topic: "{topic_name}".
The document must be written in detail (aim for 1,200 to 1,800 words) and must follow this logical hierarchy:

1. # {topic_name} - Introduction & Core Concepts
   - Thoroughly explain the core concepts, theories, and definitions of this topic.
2. # Mathematical Proofs & Key Formulas
   - List and explain all the essential formulas, theorems, mathematical proofs, or logical rules relevant to this topic. Use LaTeX format for formulas (e.g., $O(n \\log n)$ or $$a^2 + b^2 = c^2$$).
3. # Detailed Solved Examples
   - Provide at least 3 detailed, step-by-step solved examples or algorithmic traces showing how these concepts and formulas are applied.
4. # High-Yield Revision Summary
   - Highlight the critical focus areas, common exam pitfalls, and revision summaries.

Return ONLY the markdown document. Do not add any conversational text or formatting outside the markdown content."""

    user_prompt = f"Write the detailed revision study notes for the subject unit topic: {topic_name}."

    # Try Groq first (using llama-3.1-8b-instant or mixtral-8x7b-32768)
    try:
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            client = Groq(api_key=api_key)
            print(f"  [AI] Querying Groq (llama-3.1-8b-instant) for notes on '{topic_name}'...")
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=4096
            )
            content = response.choices[0].message.content.strip()
            if content:
                return content
    except Exception as e:
        print(f"  [AI WARN] Groq query failed: {e}. Trying fallback...")

    # Fallback to Cerebras
    try:
        api_key = os.getenv("CEREBRAS_API_KEY")
        if api_key:
            from db.cerebras_client import CEREBRAS_TEXT_MODEL, CEREBRAS_BASE_URL
            client = OpenAI(api_key=api_key, base_url=CEREBRAS_BASE_URL)
            print(f"  [AI] Querying Cerebras ({CEREBRAS_TEXT_MODEL}) for notes on '{topic_name}'...")
            response = client.chat.completions.create(
                model=CEREBRAS_TEXT_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=4096
            )
            content = response.choices[0].message.content.strip()
            if content:
                return content
    except Exception as e:
        print(f"  [AI ERROR] Cerebras query failed: {e}")

    raise Exception(f"Failed to generate notes content for '{topic_name}' using both Groq and Cerebras.")

def seed():
    print("==================================================")
    # 1. Insert Subject
    print("Inserting Subject: Computer Science and Application...")
    subject_res = supabase.table("subjects").insert({
        "name": "Computer Science and Application",
        "code": "CS-UGC-NET",
        "slug": "computer-science-and-application",
        "description": "UGC NET Computer Science and Application syllabus, including all 10 core units with AI-generated study guides."
    }).execute()
    
    if not subject_res.data:
        print("[ERROR] Failed to insert subject.")
        return
        
    subject_id = subject_res.data[0]["id"]
    print(f"Subject inserted successfully. ID: {subject_id}")

    # 2. Topics to seed
    topics_to_seed = [
        "Discrete Structures and Optimization",
        "Computer System Architecture",
        "Programming Languages and Computer Graphics",
        "Database Management Systems",
        "System Software and Operating System",
        "Software Engineering",
        "Data Structures and Algorithms",
        "Theory of Computation and Compilers",
        "Data Communication and Computer Networks",
        "Artificial Intelligence (AI)"
    ]

    print(f"\nInserting {len(topics_to_seed)} topics...")
    topics_payload = [
        {
            "subject_id": subject_id,
            "name": t_name,
            "notes_url": f"{t_name.upper().replace(' ', '_')}.pdf",
            "notes_version": 1
        }
        for t_name in topics_to_seed
    ]
    
    topics_res = supabase.table("topics").insert(topics_payload).execute()
    if not topics_res.data:
        print("[ERROR] Failed to insert topics.")
        return
        
    inserted_topics = topics_res.data
    print(f"Successfully inserted {len(inserted_topics)} topics.")

    # 3. Generate Notes and Seed topic_content
    print("\n==================================================")
    print("GENERATING STUDY NOTES SYLLABUS DATASET")
    print("==================================================")
    
    success_count = 0
    for topic in inserted_topics:
        topic_id = topic["id"]
        topic_name = topic["name"]
        
        print(f"\nProcessing: {topic_name}...")
        try:
            # Generate notes
            notes_content = generate_notes_with_ai(topic_name)
            word_count = len(notes_content.split())
            source_pdf = topic["notes_url"]
            
            # Insert into topic_content
            supabase.table("topic_content").insert({
                "topic_id": topic_id,
                "content": notes_content,
                "word_count": word_count,
                "source_pdf": source_pdf
            }).execute()
            
            print(f"  [OK] Successfully seeded study notes for '{topic_name}' ({word_count} words).")
            success_count += 1
            
        except Exception as e:
            print(f"  [FAIL] Failed to process '{topic_name}': {e}")
            
        # Short sleep to prevent rate limits
        time.sleep(3.0)
        
    print(f"\n==================================================")
    print(f"Seeding Complete! Seeded {success_count} / {len(inserted_topics)} study notes guides successfully.")
    print("==================================================")

if __name__ == "__main__":
    seed()
