from fastapi import APIRouter
from db.supabase_client import supabase

router = APIRouter()

@router.get("/")
def get_subjects():

    response = (
        supabase
        .table("subjects")
        .select("*")
        .execute()
    )

    return response.data