from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import uuid
import datetime
import json
from db.supabase_client import supabase
from db.cerebras_client import get_cerebras_client, CEREBRAS_TEXT_MODEL

router = APIRouter()



class CreatePostRequest(BaseModel):
    title: str
    content: str
    author_alias: str
    subject: str

class CreateReplyRequest(BaseModel):
    content: str
    author_alias: str

def moderate_text(text: str) -> dict:
    """Run text through Cerebras AI for moderation checks."""
    try:
        client = get_cerebras_client()
        system_prompt = """You are "TopperBhai Community Moderator". Your job is to analyze posts and comments submitted by students. 
Ensure the text does not contain:
1. Offensive slurs, hate speech, vulgarity, or extreme bad language.
2. Direct threats, harassment, or self-harm mentions.
3. Obvious spam or promotional links.

If the text is safe and clean, respond strictly in JSON:
{
  "is_clean": true,
  "reason": ""
}

If the text is vulgar, spammy, or harmful, respond strictly in JSON:
{
  "is_clean": false,
  "reason": "A motivational Hinglish/Hindi explanation urging them to keep discussions helpful and respectful (e.g. 'Bhai, keep it respectful! Code dojo mein bad words block ho jate hain.')"
}
"""
        response = client.chat.completions.create(
            model=CEREBRAS_TEXT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content.strip())
    except Exception as e:
        print(f"Moderation API failed fallback to clean: {e}")
        return {"is_clean": True, "reason": ""}

@router.get("/community/posts")
def get_posts(subject: str = None):
    # Try fetching from Supabase database
    try:
        query = supabase.table("community_posts").select("*, community_replies(count)")
        if subject:
            query = query.eq("subject", subject)
        res = query.order("created_at", desc=True).execute()
        
        # Format the reply counts
        posts = []
        for row in res.data:
            replies_count = 0
            if "community_replies" in row:
                count_data = row["community_replies"]
                if isinstance(count_data, list) and len(count_data) > 0:
                    replies_count = count_data[0].get("count", 0)
                elif isinstance(count_data, dict):
                    replies_count = count_data.get("count", 0)
            row["replies_count"] = replies_count
            posts.append(row)
        return posts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database read failed: {str(e)}")

@router.post("/community/posts")
def create_post(request: CreatePostRequest):
    if not request.title.strip() or not request.content.strip():
        raise HTTPException(status_code=400, detail="Title and content are required")
        
    # AI Moderation Check
    moderation_result = moderate_text(f"Title: {request.title}\nContent: {request.content}")
    if not moderation_result.get("is_clean", True):
        raise HTTPException(
            status_code=400, 
            detail=moderation_result.get("reason", "Inappropriate content detected.")
        )
        
    post_id = str(uuid.uuid4())
    created_at = datetime.datetime.now().isoformat()
    alias = request.author_alias.strip() or "Anonymous Owl"
    
    new_post = {
        "id": post_id,
        "title": request.title.strip(),
        "content": request.content.strip(),
        "author_alias": alias,
        "subject": request.subject,
        "likes": 0,
        "created_at": created_at
    }
    
    try:
        res = supabase.table("community_posts").insert(new_post).execute()
        if res.data:
            post_data = res.data[0]
            post_data["replies_count"] = 0
            return post_data
        raise Exception("No data returned")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

@router.get("/community/posts/{post_id}")
def get_post_details(post_id: str):
    post = None
    # Try database
    try:
        res = supabase.table("community_posts").select("*").eq("id", post_id).single().execute()
        post = res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database read failed: {str(e)}")
        
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    # Fetch replies
    replies = []
    try:
        replies_res = supabase.table("community_replies").select("*").eq("post_id", post_id).order("created_at", desc=False).execute()
        replies = replies_res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database read failed: {str(e)}")
        
    post["replies"] = sorted(replies, key=lambda x: x["created_at"])
    return post

@router.post("/community/posts/{post_id}/replies")
def create_reply(post_id: str, request: CreateReplyRequest):
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="Comment content is required")
        
    # Moderation Check
    moderation_result = moderate_text(request.content)
    if not moderation_result.get("is_clean", True):
        raise HTTPException(
            status_code=400, 
            detail=moderation_result.get("reason", "Inappropriate reply content detected.")
        )
        
    reply_id = str(uuid.uuid4())
    created_at = datetime.datetime.now().isoformat()
    alias = request.author_alias.strip() or "Anonymous Owl"
    
    new_reply = {
        "id": reply_id,
        "post_id": post_id,
        "content": request.content.strip(),
        "author_alias": alias,
        "created_at": created_at
    }
    
    try:
        res = supabase.table("community_replies").insert(new_reply).execute()
        if res.data:
            return res.data[0]
        raise Exception("No reply data returned")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")

@router.post("/community/posts/{post_id}/like")
def like_post(post_id: str):
    # Try DB update
    try:
        # Fetch current likes
        res = supabase.table("community_posts").select("likes").eq("id", post_id).single().execute()
        current_likes = res.data.get("likes", 0)
        
        # Increment
        update_res = supabase.table("community_posts").update({"likes": current_likes + 1}).eq("id", post_id).execute()
        if update_res.data:
            return update_res.data[0]
        raise Exception("Likes update failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
