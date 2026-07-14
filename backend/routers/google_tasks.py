from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import time
import datetime
import urllib.parse
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
    google_calendar_event_id: Optional[str] = None  # Existing Google Calendar Event ID if synced
    reminder_time: Optional[str] = None  # ISO-8601 UTC string for calendar events

@router.get("/google/auth-url")
def get_auth_url(
    user_id: str = Query(..., description="The local anonymous user UUID from localStorage"),
    frontend_url: Optional[str] = Query(None, description="The frontend URL to redirect back to after auth")
):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID is not configured on the backend.")
        
    state = user_id
    if frontend_url:
        state = f"{user_id}@@{frontend_url}"
        
    scope = "https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar.events"
    params = {
        "response_type": "code",
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": scope,
        "state": state,
        "access_type": "offline",
        "prompt": "consent"
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"
    return {"auth_url": auth_url}

@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None, state: str = None):
    user_id = state
    target_frontend_url = FRONTEND_REDIRECT_URL
    
    if state and "@@" in state:
        parts = state.split("@@", 1)
        user_id = parts[0]
        if len(parts) > 1 and parts[1]:
            target_frontend_url = parts[1]

    if error:
        return RedirectResponse(url=f"{target_frontend_url}?google_error={error}")
    if not code or not state:
        return RedirectResponse(url=f"{target_frontend_url}?google_error=missing_params")
        
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
        return RedirectResponse(url=f"{target_frontend_url}?google_error=token_exchange_failed")
        
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
                return RedirectResponse(url=f"{target_frontend_url}?google_error=consent_required")
            supabase.table("user_google_tokens").insert(payload).execute()
            
        return RedirectResponse(url=f"{target_frontend_url}?google_connected=true")
    except Exception as e:
        return RedirectResponse(url=f"{target_frontend_url}?google_error=database_error&msg={str(e)}")

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
        list_id = res.data[0]["google_task_list_id"]
        # Verify the list still exists
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient() as client:
            check_res = await client.get(f"https://tasks.googleapis.com/tasks/v1/users/@me/lists/{list_id}", headers=headers)
            if check_res.status_code == 200:
                return list_id
            elif check_res.status_code in [404, 403]:
                # If deleted or inaccessible, clear cache and proceed
                supabase.table("user_google_tokens").update({"google_task_list_id": None}).eq("user_id", user_id).execute()
        
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        # Check existing lists
        lists_res = await client.get("https://tasks.googleapis.com/tasks/v1/users/@me/lists", headers=headers)
        if lists_res.status_code == 200:
            task_lists = lists_res.json().get("items", [])
            for t_list in task_lists:
                if t_list.get("title") == "TopperBhai Task Quest":
                    list_id = t_list.get("id")
                    supabase.table("user_google_tokens").update({"google_task_list_id": list_id}).eq("user_id", user_id).execute()
                    return list_id
                    
        # If not found, create new list
        create_res = await client.post(
            "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
            headers=headers,
            json={"title": "TopperBhai Task Quest"}
        )
        if create_res.status_code not in [200, 201]:
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
    
    # --- 1. Sync Google Task ---
    google_task_id = request.google_task_id
    google_status = "completed" if request.status == "completed" else "needsAction"
    
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
        task_synced = False
        if google_task_id:
            url = f"https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks/{google_task_id}"
            res = await client.patch(url, headers=headers, json=task_payload)
            print(f"[DEBUG] Google task update status: {res.status_code}, response: {res.text}")
            if res.status_code in [200, 201, 204]:
                task_synced = True
            elif res.status_code == 404:
                google_task_id = None  # Recreate
                
        if not google_task_id:
            url = f"https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks"
            res = await client.post(url, headers=headers, json=task_payload)
            if res.status_code in [200, 201]:
                google_task_id = res.json().get("id")
                task_synced = True
            else:
                raise HTTPException(status_code=res.status_code, detail=f"Google Tasks creation failed: {res.text}")
                
        if not task_synced:
            raise HTTPException(status_code=400, detail="Failed to sync task to Google Tasks.")

        # --- 2. Sync Google Calendar Event (For Alarm Reminders) ---
        google_calendar_event_id = request.google_calendar_event_id
        if request.reminder_time:
            try:
                dt_str = request.reminder_time.split(".")[0].replace("Z", "")
                start_dt = datetime.datetime.fromisoformat(dt_str)
            except Exception:
                start_dt = datetime.datetime.now()
            
            end_dt = start_dt + datetime.timedelta(minutes=30)
            
            event_payload = {
                "summary": f"Study Quest: {request.title}",
                "description": request.description,
                "start": {
                    "dateTime": start_dt.isoformat() + "Z",
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": end_dt.isoformat() + "Z",
                    "timeZone": "UTC"
                },
                "reminders": {
                    "useDefault": False,
                    "overrides": [
                        {"method": "popup", "minutes": 0},  # Immediate mobile alarm/alert
                        {"method": "popup", "minutes": 10}  # 10 minute warning
                    ]
                }
            }
            
            if google_calendar_event_id:
                url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{google_calendar_event_id}"
                cal_res = await client.put(url, headers=headers, json=event_payload)
                if cal_res.status_code == 403:
                    raise HTTPException(
                        status_code=403,
                        detail="Google Calendar permission is missing or insufficient. Please disconnect and reconnect your Google account."
                    )
                elif cal_res.status_code not in [200, 201]:
                    google_calendar_event_id = None # Recreate if deleted/not found
            
            if not google_calendar_event_id:
                url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
                cal_res = await client.post(url, headers=headers, json=event_payload)
                if cal_res.status_code in [200, 201]:
                    google_calendar_event_id = cal_res.json().get("id")
                elif cal_res.status_code == 403:
                    raise HTTPException(
                        status_code=403,
                        detail="Google Calendar permission is missing or insufficient. Please disconnect and reconnect your Google account."
                    )
                else:
                    print(f"[WARNING] Google Calendar Event creation failed: {cal_res.text}")
                    
        elif google_calendar_event_id:
            # If reminder was cleared, delete the calendar event
            url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{google_calendar_event_id}"
            await client.delete(url, headers=headers)
            google_calendar_event_id = None

    return {
        "status": "success",
        "google_task_id": google_task_id,
        "google_calendar_event_id": google_calendar_event_id
    }

@router.delete("/google/delete-task/{user_id}/{google_task_id}")
async def delete_task(user_id: str, google_task_id: str, google_calendar_event_id: Optional[str] = Query(None)):
    access_token = await get_google_access_token(user_id)
    list_id = await get_or_create_task_list(user_id, access_token)
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks/{google_task_id}"
    
    async with httpx.AsyncClient() as client:
        res = await client.delete(url, headers=headers)
        
        # Also delete calendar event if it exists and is a valid ID
        if google_calendar_event_id and google_calendar_event_id not in ["", "null", "undefined"]:
            cal_url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events/{google_calendar_event_id}"
            await client.delete(cal_url, headers=headers)
        
    if res.status_code not in [200, 204, 404]:
        raise HTTPException(status_code=res.status_code, detail=f"Google API delete failed: {res.text}")
        
    return {"status": "deleted"}

class StudyPlanTaskSync(BaseModel):
    title: str
    description: str
    reminder_time: Optional[str] = None

class StudyPlanSyncRequest(BaseModel):
    user_id: str
    exam_name: str
    tasks: list[StudyPlanTaskSync]

@router.post("/google/sync-study-plan")
async def sync_study_plan(request: StudyPlanSyncRequest):
    access_token = await get_google_access_token(request.user_id)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # 1. Create a new task list named after the exam
    async with httpx.AsyncClient() as client:
        list_payload = {"title": f"TopperBhai: {request.exam_name}"}
        list_res = await client.post(
            "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
            headers=headers,
            json=list_payload
        )
        if list_res.status_code not in [200, 201]:
            if list_res.status_code == 403:
                raise HTTPException(
                    status_code=403,
                    detail="Google Calendar/Tasks permission is missing or insufficient. Please disconnect and reconnect your Google account."
                )
            raise HTTPException(status_code=list_res.status_code, detail=f"Failed to create Google Task List: {list_res.text}")
            
        list_id = list_res.json().get("id")
        
        # 2. Add each task to the newly created task list & schedule in Calendar
        created_tasks = []
        for i, task in enumerate(request.tasks):
            task_payload = {
                "title": task.title,
                "notes": task.description,
                "status": "needsAction" # uncompleted
            }
            task_res = await client.post(
                f"https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks",
                headers=headers,
                json=task_payload
            )
            if task_res.status_code in [200, 201]:
                created_tasks.append(task_res.json().get("id"))
            
            # Sync to Google Calendar
            if task.reminder_time:
                try:
                    dt_str = task.reminder_time.split(".")[0].replace("Z", "")
                    start_dt = datetime.datetime.fromisoformat(dt_str)
                except Exception:
                    start_dt = datetime.datetime.now() + datetime.timedelta(days=i+1)
                
                end_dt = start_dt + datetime.timedelta(minutes=30)
                
                event_payload = {
                    "summary": task.title,
                    "description": task.description,
                    "start": {
                        "dateTime": start_dt.isoformat() + "Z",
                        "timeZone": "UTC"
                    },
                    "end": {
                        "dateTime": end_dt.isoformat() + "Z",
                        "timeZone": "UTC"
                    },
                    "reminders": {
                        "useDefault": False,
                        "overrides": [
                            {"method": "popup", "minutes": 0},
                            {"method": "popup", "minutes": 10}
                        ]
                    }
                }
                
                cal_res = await client.post(
                    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                    headers=headers,
                    json=event_payload
                )
                if cal_res.status_code == 403:
                    raise HTTPException(
                        status_code=403,
                        detail="Google Calendar permission is missing or insufficient. Please disconnect and reconnect your Google account."
                    )
                elif cal_res.status_code not in [200, 201]:
                    print(f"[WARNING] Study Plan Calendar Event creation failed: {cal_res.text}")
                
    return {
        "status": "success",
        "google_task_list_id": list_id,
        "task_count": len(created_tasks)
    }

@router.delete("/google/delete-task-list/{user_id}/{google_task_list_id}")
async def delete_task_list(user_id: str, google_task_list_id: str):
    print(f"[DEBUG] Deleting task list {google_task_list_id} for user {user_id}")
    access_token = await get_google_access_token(user_id)
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://tasks.googleapis.com/tasks/v1/users/@me/lists/{google_task_list_id}"
    
    async with httpx.AsyncClient() as client:
        res = await client.delete(url, headers=headers)
        
    print(f"[DEBUG] Google delete list response status: {res.status_code}, text: {res.text}")
    if res.status_code not in [200, 204, 404]:
        raise HTTPException(status_code=res.status_code, detail=f"Google API delete list failed: {res.text}")
        
    return {"status": "deleted"}

@router.get("/google/get-tasks-status/{user_id}")
async def get_tasks_status(user_id: str):
    access_token = await get_google_access_token(user_id)
    list_id = await get_or_create_task_list(user_id, access_token)
    
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://tasks.googleapis.com/tasks/v1/lists/{list_id}/tasks?showCompleted=true&showHidden=true"
    
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        
    if res.status_code != 200:
        # If the task list doesn't exist yet, return an empty status map
        if res.status_code == 404:
            return {}
        raise HTTPException(status_code=res.status_code, detail=f"Google API list tasks failed: {res.text}")
        
    tasks_data = res.json().get("items", [])
    
    # Return a map of google_task_id -> status ('completed' or 'needsAction')
    status_map = {}
    for item in tasks_data:
        g_id = item.get("id")
        status = item.get("status") # 'completed' or 'needsAction'
        if g_id:
            status_map[g_id] = status
            
    return status_map
