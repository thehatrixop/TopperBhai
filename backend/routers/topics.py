from fastapi import APIRouter
from db.supabase_client import supabase

router = APIRouter()

@router.get("/topics/{subject_id}")
def get_topics(subject_id: str):

    response = (
        supabase
        .table("topics")
        .select("*")
        .eq("subject_id", subject_id)
        .execute()
    )

    return response.data
    
@router.get("/topics/by-slug/{slug}")
def get_topics_by_slug(slug: str):

    subject_response = (
        supabase
        .table("subjects")
        .select("id, name")
        .eq("slug", slug)
        .single()
        .execute()
    )

    subject_id = subject_response.data["id"]
    subject_name = subject_response.data["name"]

    topics_response = (
        supabase
        .table("topics")
        .select("*")
        .eq("subject_id", subject_id)
        .execute()
    )

    return {"name": subject_name, "topics": topics_response.data}