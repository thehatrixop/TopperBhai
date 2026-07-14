from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from db.cerebras_client import get_cerebras_client, CEREBRAS_TEXT_MODEL

router = APIRouter()

class GenerateStudyPlanRequest(BaseModel):
    exam_name: str
    duration_months: int
    hours_per_day: int
    priority_subjects: str
    additional_info: str | None = None

@router.post("/study-plan/generate")
def generate_study_plan(request: GenerateStudyPlanRequest):
    if not request.exam_name.strip() or not request.priority_subjects.strip():
        raise HTTPException(status_code=400, detail="Exam name and priority subjects are required")
        
    client = get_cerebras_client()
    
    system_prompt = """You are "TopperBhai study plan architect", a master coach for engineering and competitive exams.
Generate a structured weekly study plan as a JSON object. The response must follow this EXACT schema:
{
  "plan_name": "Name of the study plan, describing duration and exam (e.g. 3-Month Plan for UGC NET Computer Science)",
  "weekly_tasks": [
    {
      "week_number": 1,
      "theme": "Theme of the week (e.g. Core Algorithms & DBMS Foundations)",
      "tasks": [
        {
          "id": "w1-t1",
          "title": "Title of the task",
          "description": "Short description of what to study or solve",
          "priority": "high",  // must be either "low", "medium", or "high"
          "estimated_hours": 4, // estimate hours as an integer
          "completed": false
        }
      ]
    }
  ]
}
Design the weekly progression sensibly based on the daily hours, duration, and priority subjects. Ensure tasks are concrete and actionable. Return ONLY the JSON object. Do not wrap it in markdown formatting or return extra text."""

    user_prompt = f"""Exam Target: {request.exam_name}
Total study period: {request.duration_months} months
Daily study allocation: {request.hours_per_day} hours/day
High priority subjects/topics: {request.priority_subjects}
Additional details/study style constraint: {request.additional_info or "None"}"""

    try:
        response = client.chat.completions.create(
            model=CEREBRAS_TEXT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        plan_data = json.loads(response.choices[0].message.content.strip())
        
        # Normalize and format task titles to "WXX-YY-title"
        if "weekly_tasks" in plan_data and isinstance(plan_data["weekly_tasks"], list):
            import re
            for week in plan_data["weekly_tasks"]:
                week_num = week.get("week_number", 1)
                w_str = f"W{str(week_num).zfill(2)}"
                tasks = week.get("tasks", [])
                if isinstance(tasks, list):
                    for idx, task in enumerate(tasks):
                        t_str = str(idx + 1).zfill(2)
                        orig_title = task.get("title", "")
                        # Clean any existing "WXX-YY-" prefixes from the start of the title
                        cleaned_title = re.sub(r'^W\d+-\d+-', '', orig_title).strip()
                        task["title"] = f"{w_str}-{t_str}-{cleaned_title}"
                        
        return plan_data
    except Exception as e:
        print(f"Cerebras study plan generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI Study Plan generation failed: {str(e)}")
