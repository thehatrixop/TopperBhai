import sys
from pathlib import Path

# Add parent dir to path so we can import db module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.supabase_client import supabase

def verify():
    print("==============================================")
    print("DATABASE UPLOAD VALIDATION SANITY CHECK")
    print("==============================================")
    try:
        # 1. Total count of PYQs in database
        res = supabase.table("pyqs").select("id", count="exact").limit(1).execute()
        total_count = res.count
        print(f"Total PYQ questions in database: {total_count}")
        
        # 2. Get list of topics
        topics_res = supabase.table("topics").select("id, name").execute()
        topics = topics_res.data or []
        
        print("\nQuestions per topic:")
        for topic in topics:
            topic_id = topic["id"]
            topic_name = topic["name"]
            
            count_res = supabase.table("pyqs").select("id", count="exact").eq("topic_id", topic_id).limit(1).execute()
            print(f" - {topic_name}: {count_res.count} questions")
            
        # 3. Print a sample question
        sample_res = supabase.table("pyqs").select("question_text, options, answer_key, solution, year").limit(1).execute()
        if sample_res.data:
            sample = sample_res.data[0]
            print("\nSample Question Record:")
            print(f"  Year: {sample.get('year')}")
            print(f"  Text: {sample.get('question_text')[:150]}...")
            print(f"  Options: {sample.get('options')}")
            print(f"  Correct Answer: {sample.get('answer_key')}")
            print(f"  Solution: {sample.get('solution')[:100]}...")
            
    except Exception as e:
        print("Validation Error:", e)

if __name__ == "__main__":
    verify()
