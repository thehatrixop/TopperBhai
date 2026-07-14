from db.supabase_client import supabase
import sys

def main():
    print("Testing Supabase connection and tables...")
    try:
        # Check user_google_tokens table
        print("\n1. Querying 'user_google_tokens' table...")
        res = supabase.table("user_google_tokens").select("*").limit(1).execute()
        print("[SUCCESS] 'user_google_tokens' query returned successfully.")
        print(f"Data: {res.data}")
    except Exception as e:
        print("[ERROR] Failed to query 'user_google_tokens':")
        print(e)
        
    try:
        # Check task_reminders table
        print("\n2. Querying 'task_reminders' table...")
        res = supabase.table("task_reminders").select("*").limit(1).execute()
        print("[SUCCESS] 'task_reminders' query returned successfully.")
        print(f"Data: {res.data}")
    except Exception as e:
        print("[ERROR] Failed to query 'task_reminders':")
        print(e)

if __name__ == "__main__":
    main()
