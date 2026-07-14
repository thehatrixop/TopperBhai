from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os
import json
import datetime
import threading
import time
from db.supabase_client import supabase
from pywebpush import webpush, WebPushException

router = APIRouter()

# Schema for scheduling a reminder
class ScheduleReminderRequest(BaseModel):
    task_id: str
    subscription: dict
    title: str
    description: str
    reminder_time: str  # ISO-8601 string: YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS

@router.get("/notifications/vapid-public-key")
def get_vapid_public_key():
    public_key = os.getenv("VAPID_PUBLIC_KEY")
    if not public_key:
        raise HTTPException(status_code=500, detail="VAPID public key not configured on backend.")
    return {"public_key": public_key}

@router.post("/notifications/schedule-reminder")
def schedule_reminder(request: ScheduleReminderRequest):
    try:
        # Check if reminder already exists for this task_id
        existing = supabase.table("task_reminders").select("id").eq("task_id", request.task_id).execute()
        
        payload = {
            "task_id": request.task_id,
            "subscription": request.subscription,
            "title": request.title,
            "description": request.description,
            "reminder_time": request.reminder_time,
            "sent": False
        }
        
        if existing.data and len(existing.data) > 0:
            # Update
            res = supabase.table("task_reminders").update(payload).eq("task_id", request.task_id).execute()
        else:
            # Insert
            res = supabase.table("task_reminders").insert(payload).execute()
            
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to schedule reminder: {str(e)}")

@router.delete("/notifications/cancel-reminder/{task_id}")
def cancel_reminder(task_id: str):
    try:
        res = supabase.table("task_reminders").delete().eq("task_id", task_id).execute()
        return {"status": "success", "message": f"Cancelled reminder for task {task_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel reminder: {str(e)}")


# --- Web Push Sender Utility ---

def send_web_push(subscription: dict, title: str, body: str, task_id: str):
    private_key = os.getenv("VAPID_PRIVATE_KEY")
    if not private_key:
        print("[ERROR] VAPID_PRIVATE_KEY not set in environment.")
        return False
        
    payload = {
        "title": title,
        "body": body,
        "task_id": task_id,
        "timestamp": datetime.datetime.now().isoformat()
    }
    
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=private_key,
            vapid_claims={"sub": "mailto:support@topperbhai.com"}
        )
        print(f"[SUCCESS] Sent Web Push for task: {task_id}")
        return True
    except WebPushException as ex:
        print(f"[ERROR] WebPushException sending to {task_id}: {repr(ex)}")
        # Delete invalid/expired subscriptions
        if ex.response is not None and ex.response.status_code in [404, 410]:
            print(f"[INFO] Subscription expired or gone (status {ex.response.status_code}). Removing from database.")
            try:
                supabase.table("task_reminders").delete().eq("task_id", task_id).execute()
            except Exception as db_err:
                print(f"[ERROR] Failed to delete expired reminder: {db_err}")
        return False
    except Exception as e:
        print(f"[ERROR] Unexpected exception sending Web Push: {e}")
        return False


# --- Background Scheduler Thread ---

def check_and_send_reminders():
    """Queries Supabase for pending reminders and triggers Web Push."""
    try:
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        # Fetch reminders that are unsent and whose scheduled time is in the past/present
        # Supabase stores timestamps in UTC.
        res = (
            supabase.table("task_reminders")
            .select("*")
            .eq("sent", False)
            .lte("reminder_time", now_utc.isoformat())
            .execute()
        )
        
        reminders = res.data or []
        for r in reminders:
            task_id = r.get("task_id")
            subscription = r.get("subscription")
            title = r.get("title", "Study Reminder! ⏱️")
            desc = r.get("description", "Time to study.")
            
            # Send push
            success = send_web_push(
                subscription=subscription,
                title=f"Study Time: {title} 📚",
                body=desc,
                task_id=task_id
            )
            
            # Update database status
            if success:
                supabase.table("task_reminders").update({"sent": True}).eq("id", r.get("id")).execute()
            else:
                # Even if failed, mark as sent or delete if it's expired to avoid infinite loops on invalid credentials
                supabase.table("task_reminders").update({"sent": True}).eq("id", r.get("id")).execute()
                
    except Exception as e:
        print(f"[ERROR] check_and_send_reminders failed: {e}")

def run_reminder_scheduler():
    """Runs infinite loop in a daemon thread checking reminders every 15 seconds."""
    print("[INIT] Starting Task Quest Web Push Reminder Scheduler...")
    while True:
        try:
            check_and_send_reminders()
        except Exception as e:
            print(f"[ERROR] Scheduler error: {e}")
        time.sleep(15)

def start_scheduler_thread():
    t = threading.Thread(target=run_reminder_scheduler, daemon=True)
    t.start()
