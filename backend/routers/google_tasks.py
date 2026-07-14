from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import time
import httpx
from typing import Optional
from db.supabase_client import supabase

router = APIRouter()

# Client credentials should be set in backend/.env
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
# Redirect URL back to our backend callback
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/google/callback")
# Frontend redirect landing page
FRONTEND_REDIRECT_URL = os.getenv("FRONTEND_REDIRECT_URL", "http://localhost:3000/features/task-quest")

class TaskSyncRequest(BaseModel):
    user_id: str
    task_id: str  # local task ID
    title: str
    description: str
    due_date: Optional[str] = None  # YYYY-MM-DD format
    status: str  # 'backlog' | 'inProgress' | 'review' | 'completed'
    google_task_id: Optional[str] = None  # Existing Google Task ID if synced already

@router.get("/google/auth-url")
def get_auth_url(user_id: str = Query(..., description="The local anonymous user UUID from localStorage")):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID is not configured on the backend.")
        
    scope = "https://www.googleapis.com/auth/tasks"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code"
        f"&client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&scope={scope}"
        f"&state={user_id}"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return {"auth_url": auth_url}

@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None, state: str = None):
    if error:
        return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}?google_error={error}")
    if not code or not state:
        return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}?google_error=missing_params")
        
    user_id = state
    
    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code"
            }
        )
        
    if token_res.status_code != 200:
        return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}?google_error=token_exchange_failed")
        
    tokens = token_res.json()
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)
    expires_at = int(time.time()) + expires_in
    
    # Save tokens to database
    try:
        # Check if record exists
        existing = supabase.table("user_google_tokens").select("user_id", "refresh_token").eq("user_id", user_id).execute()
        
        payload = {
            "user_id": user_id,
            "access_token": access_token,
            "expires_at": expires_at
        }
        # Keep old refresh token if Google didn't return a new one (offline access refresh token is only sent on first consent)
        if refresh_token:
            payload["refresh_token"] = refresh_token
            
        if existing.data and len(existing.data) > 0:
            supabase.table("user_google_tokens").update(payload).eq("user_id", user_id).execute()
        else:
            if not refresh_token:
                # If we don't have a refresh token and it's a new registration, redirect to consent prompt again
                return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}?google_error=consent_required")
            supabase.table("user_google_tokens").insert(payload).execute()
            
        return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}?google_connected=true")
    except Exception as e:
        return RedirectResponse(url=f"{FRONTEND_REDIRECT_URL}?google_error=database_error&msg={str(e)}")

# Helper to get authenticated client, refreshing tokens if expired
async def get_google_access_token(user_id: str) -> str:
    res = supabase.table("user_google_tokens").select("*").eq("user_id", user_id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=401, detail="User is not authenticated with Google Tasks.")
        
    user_token = res.data[0]
    expires_at = user_token.get("expires_at", 0)
    
    # If token expires in less than 5 minutes, refresh it
    if expires_at - int(time.time()) < 300:
        refresh_token = user_token.get("refresh_token")
        if not refresh_token:
            raise HTTPException(status_code=401, detail="Refresh token missing. Re-authentication required.")
            
        async with httpx.AsyncClient() as client:
            refresh_res = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "refresh_token": refresh_token,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "grant_type": "refresh_token"
                }
            )
            
        if refresh_res.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to refresh Google credentials.")
            
        tokens = refresh_res.json()
        new_access_token = tokens.get("access_token")
        expires_in = tokens.get("expires_in", 3600)
        new_expires_at = int(time.time()) + expires_in
        
        # Save new access token
        supabase.table("user_google_tokens").update({
            "access_token": new_access_token,
            "expires_at": new_expires_at
        }).eq("user_id", user_id).execute()
        
        return new_access_token
        
    return user_token.get("access_token")

# Helper to get or create TopperBhai Task list
async def get_or_create_task_list(user_id: str, access_token: str) -> str:
    # Check if we already saved the list_id
    res = supabase.table("user_google_tokens").select("google_task_list_id").eq("user_id", user_id).execute()
    if res.data and res.data[0].get("google_task_list_id"):
        return res.data[0]["google_task_list_id"]
        
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        # Check existing lists
        lists_res = await client.get("https://tasks.googleapis.com/v1/users/@me/lists", headers=headers)
        if lists_res.status_code == 200:
            task_lists = lists_res.json().get("items", [])
            for t_list in task_lists:
                if t_list.get("title") == "TopperBhai Task Quest":
                    list_id = t_list.get("id")
                    supabase.table("user_google_tokens").update({"google_task_list_id": list_id}).eq("user_id", user_id).execute()
                    return list_id
                    
        # If not found, create new list
        create_res = await client.post(
            "https://tasks.googleapis.com/v1/users/@me/lists",
            headers=headers,
            json={"title": "TopperBhai Task Quest"}
        )
        if create_res.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to create Google Tasks list.")
            
        list_id = create_res.json().get("id")
        supabase.table("user_google_tokens").update({"google_task_list_id": list_id}).eq("user_id", user_id).execute()
        return list_id

@router.post("/google/sync-task")
async def sync_task(request: TaskSyncRequest):
    access_token = await get_google_access_token(request.user_id)
    list_id = await get_or_create_task_list(request.user_id, access_token)
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Format Google Task payload
    # Status in Google Tasks is either 'needsAction' or 'completed'
    google_status = "completed" if request.status == "completed" else "needsAction"
    
    # Format due date (Google Tasks expects RFC 3339 formatted date-only at midnight UTC, e.g. YYYY-MM-DDT00:00:00.000Z)
    due_timestamp = None
    if request.due_date:
        due_timestamp = f"{request.due_date}T00:00:00.000Z"
        
    task_payload = {
        "title": request.title,
        "notes": request.description,
        "status": google_status
    }
    if due_timestamp:
        task_payload["due"] = due_timestamp
        
    async with httpx.AsyncClient() as client:
        if request.google_task_id:
            # Update existing task
            # If status changes to completed/needsAction, we might need to send it
            url = f"https://tasks.googleapis.com/v1/lists/{list_id}/tasks/{request.google_task_id}"
            res = await client.put(url, headers=headers, json=task_payload)
            if res.status_code == 200:
                return {"status": "updated", "google_task_id": request.google_task_id}
            elif res.status_code == 404:
                # If deleted in Google Tasks, recreate it
                pass
            else:
                raise HTTPException(status_code=res.status_code, detail=f"Google API update failed: {res.text}")
                
        # Create a new task
        url = f"https://tasks.googleapis.com/v1/lists/{list_id}/tasks"
        res = await client.post(url, headers=headers, json=task_payload)
        if res.status_code == 200:
            new_google_task_id = res.json().get("id")
            return {"status": "created", "google_task_id": new_google_task_id}
        else:
            raise HTTPException(status_code=res.status_code, detail=f"Google API creation failed: {res.text}")

@router.delete("/google/delete-task/{user_id}/{google_task_id}")
async def delete_task(user_id: str, google_task_id: str):
    access_token = await get_google_access_token(user_id)
    list_id = await get_or_create_task_list(user_id, access_token)
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://tasks.googleapis.com/v1/lists/{list_id}/tasks/{google_task_id}"
    
    async with httpx.AsyncClient() as client:
        res = await client.delete(url, headers=headers)
        
    if res.status_code not in [200, 204, 404]:
        raise HTTPException(status_code=res.status_code, detail=f"Google API delete failed: {res.text}")
        
    return {"status": "deleted"}
