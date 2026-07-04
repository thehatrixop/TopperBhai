"""
Upload Extracted Text to Supabase
==================================
Reads all .txt files from the extracted_texts folder and uploads
them to the `topic_content` table in Supabase.

Matches filenames to topic names in the `topics` table to get topic_id.

Usage:
    python scripts/upload_to_supabase.py --input "D:\path\to\text_files"

Requires:
    pip install supabase python-dotenv
"""

import argparse
import sys
from pathlib import Path

# Add parent dir to path so we can import db module
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.supabase_client import supabase


def normalize_name(name: str) -> str:
    """Normalize topic name for matching (lowercase, strip, replace & with and)."""
    return (
        name.lower()
        .strip()
        .replace("&", "and")
        .replace("  ", " ")
    )


def load_topics_from_db():
    """Fetch all topics from the topics table."""
    response = supabase.table("topics").select("id, name").execute()
    return response.data


def upload_texts(input_dir: Path) -> None:
    """Read .txt files and upload to topic_content table."""

    if not input_dir.exists():
        print(f"[ERROR] Input folder not found: {input_dir}")
        sys.exit(1)

    txt_files = sorted(input_dir.glob("*.txt"))
    if not txt_files:
        print(f"[WARN] No .txt files found in: {input_dir}")
        sys.exit(0)

    # Fetch existing topics from DB
    print("[INFO] Fetching topics from Supabase...")
    topics = load_topics_from_db()

    if not topics:
        print("[ERROR] No topics found in the database.")
        sys.exit(1)

    # Build a lookup: normalized_name -> topic record
    topic_lookup = {}
    for topic in topics:
        normalized = normalize_name(topic["name"])
        topic_lookup[normalized] = topic

    print(f"[INFO] Found {len(topics)} topics in DB")
    print(f"[INFO] Found {len(txt_files)} text files to upload")
    print("-" * 60)

    success_count = 0
    skip_count = 0
    error_count = 0

    for txt_path in txt_files:
        filename = txt_path.stem  # e.g., "Percentages"
        normalized_filename = normalize_name(filename)

        # Try to match to a topic
        matched_topic = topic_lookup.get(normalized_filename)

        if not matched_topic:
            # Try partial matching as fallback
            for norm_name, topic in topic_lookup.items():
                if norm_name in normalized_filename or normalized_filename in norm_name:
                    matched_topic = topic
                    break

        if not matched_topic:
            print(f"  [{filename}] -> [SKIP] No matching topic found in DB")
            print(f"    Available topics: {[t['name'] for t in topics]}")
            skip_count += 1
            continue

        # Read content
        content = txt_path.read_text(encoding="utf-8")
        word_count = len(content.split())
        source_pdf = filename + ".pdf"

        try:
            # Check if content already exists for this topic
            existing = (
                supabase.table("topic_content")
                .select("id")
                .eq("topic_id", matched_topic["id"])
                .execute()
            )

            if existing.data:
                # Update existing record
                supabase.table("topic_content").update({
                    "content": content,
                    "word_count": word_count,
                    "source_pdf": source_pdf,
                }).eq("topic_id", matched_topic["id"]).execute()
                print(f"  [{filename}] -> [UPDATED] topic: {matched_topic['name']} ({word_count} words)")
            else:
                # Insert new record
                supabase.table("topic_content").insert({
                    "topic_id": matched_topic["id"],
                    "content": content,
                    "word_count": word_count,
                    "source_pdf": source_pdf,
                }).execute()
                print(f"  [{filename}] -> [OK] topic: {matched_topic['name']} ({word_count} words)")

            success_count += 1

        except Exception as e:
            print(f"  [{filename}] -> [FAIL] {e}")
            error_count += 1

    print("-" * 60)
    print(f"\nDone! {success_count} uploaded, {skip_count} skipped, {error_count} failed")


if __name__ == "__main__":
    # Resolve input directory dynamically relative to script location
    script_dir = Path(__file__).resolve().parent.parent  # backend/
    default_input = script_dir.parent / "dataset" / "aptitude_text"

    parser = argparse.ArgumentParser(
        description="Upload extracted text files to Supabase topic_content table"
    )
    parser.add_argument(
        "--input", "-i",
        type=Path,
        default=default_input,
        help=f"Folder containing .txt files (default: {default_input})"
    )

    args = parser.parse_args()
    upload_texts(args.input)
