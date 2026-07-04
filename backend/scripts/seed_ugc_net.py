import sys
from pathlib import Path

# Add parent dir to path so we can import db module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.supabase_client import supabase

def seed():
    # 1. Clear database
    print("Clearing existing tables in Supabase...")
    
    # Clean topic content, pyqs, papers
    res = supabase.table("topic_content").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"Cleared topic_content: {len(res.data)} rows")

    res = supabase.table("pyqs").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"Cleared pyqs: {len(res.data)} rows")

    res = supabase.table("generated_papers").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"Cleared generated_papers: {len(res.data)} rows")

    # Clean topics and subjects
    res = supabase.table("topics").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"Cleared topics: {len(res.data)} rows")

    res = supabase.table("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print(f"Cleared subjects: {len(res.data)} rows")

    # 2. Insert single subject
    print("\nInserting Subject: Computer Science and Application...")
    subject_res = supabase.table("subjects").insert({
        "name": "Computer Science and Application",
        "code": "CS-UGC-NET",
        "slug": "computer-science-and-application",
        "description": "UGC NET Computer Science and Application syllabus, including all 10 core units."
    }).execute()
    
    subject_id = subject_res.data[0]["id"]
    print(f"Subject inserted successfully. ID: {subject_id}")

    # 3. Insert topics
    topics_to_seed = [
        {"name": "Discrete Structures and Optimization", "notes_url": "DISCRETE STRUCTURES AND OPTIMIZATION.pdf"},
        {"name": "Computer System Architecture", "notes_url": "COMPUTER SYSTEM ARCHITECTURE.pdf"},
        {"name": "Programming Languages and Computer Graphics", "notes_url": "PROGRAMMING LANGUAGES AND COMPUTER GRAPHICS.pdf"},
        {"name": "Database Management Systems", "notes_url": "DATABASE MANAGEMENT SYSTEMS.pdf"},
        {"name": "System Software and Operating System", "notes_url": "SYSTEM SOFTWARE AND OPERATING SYSTEM.pdf"},
        {"name": "Software Engineering", "notes_url": "SOFTWARE ENGINEERING.pdf"},
        {"name": "Data Structures and Algorithms", "notes_url": "DATA STRUCTURES AND ALGORITHMS.pdf"},
        {"name": "Theory of Computation and Compilers", "notes_url": "THEORY OF COMPUTATION AND COMPILERS.pdf"},
        {"name": "Data Communication and Computer Networks", "notes_url": "DATA COMMUNICATION AND COMPUTER NETWORKS.pdf"},
        {"name": "Artificial Intelligence (AI)", "notes_url": "ARTIFICIAL INTELLIGENCE (AI).pdf"}
    ]

    print("\nInserting Topics...")
    topics_payload = [
        {
            "subject_id": subject_id,
            "name": t["name"],
            "notes_url": t["notes_url"],
            "notes_version": 1
        }
        for t in topics_to_seed
    ]
    
    topics_res = supabase.table("topics").insert(topics_payload).execute()
    print(f"Successfully inserted {len(topics_res.data)} topics.")

if __name__ == "__main__":
    seed()
