import sys
from pathlib import Path

# Add parent dir to path so we can import db module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from db.supabase_client import supabase

def count_files():
    try:
        # List pyq_images folder
        pyq_imgs = supabase.storage.from_("Notes").list(path="pyq_images", options={"limit": 1000})
        print(f"Number of question crop images uploaded: {len(pyq_imgs)}")
        
        # List page_images folder
        page_imgs = supabase.storage.from_("Notes").list(path="page_images", options={"limit": 1000})
        print(f"Number of page scans uploaded: {len(page_imgs)}")
        
        # Count PYQs in db
        res = supabase.table("pyqs").select("id", count="exact").limit(1).execute()
        print(f"Number of questions inserted in pyqs table: {res.count}")
    except Exception as e:
        print("Error checking storage:", e)

if __name__ == "__main__":
    count_files()
