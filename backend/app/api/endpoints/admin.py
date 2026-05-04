from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List
from datetime import datetime
from app.schemas.database import JobPosting
from app.core.security import get_current_user

# Using your project's custom args2 module!
from args2 import ObjectId 

router = APIRouter()

# ---------------------------------------------------------
# INPUT SCHEMA: What we expect from the React Frontend
# Notice it does NOT ask for admin_id, _id, or created_at
# ---------------------------------------------------------
class JobPostingCreate(BaseModel):
    organization_name: str
    title: str
    job_description: str
    preferred_questions: List[str] = []
    ask_category: bool = False
    start_time: datetime
    end_time: datetime

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------
@router.post("/jobs", status_code=201)
async def create_job_posting(request: Request, job_data: JobPostingCreate, current_user: dict = Depends(get_current_user)):
    # 1. Protection
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create job postings")

    db = request.app.mongodb
    
    # 2. Merge the frontend data with the secure Token data
    new_job = JobPosting(
        admin_id=current_user["user_id"],
        **job_data.model_dump()
    )

    # 3. Save to MongoDB
    job_dict = new_job.model_dump(by_alias=True, exclude={"id"})
    result = await db.job_postings.insert_one(job_dict)

    return {"message": "Job posted successfully", "job_id": str(result.inserted_id)}


@router.get("/jobs/live")
async def get_live_jobs(request: Request, current_user: dict = Depends(get_current_user)):
    # 1. Protection
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view this dashboard")

    db = request.app.mongodb
    
    # 2. Fetch all active jobs created by THIS specific admin
    cursor = db.job_postings.find({"admin_id": current_user["user_id"], "is_active": True})
    jobs = await cursor.to_list(length=100)

    # 3. Format ObjectIds for JSON
    for job in jobs:
        job["_id"] = str(job["_id"])

    return jobs


@router.get("/jobs/{job_id}/candidates")
async def get_job_candidates(job_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Fetches all candidates who took a specific job interview, including their photo."""
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view candidate reports")

    db = request.app.mongodb
    
    # Fetch all interview attempts for this job
    cursor = db.interview_attempts.find({"job_id": job_id})
    attempts = await cursor.to_list(length=100)
    
    results = []
    for attempt in attempts:
        candidate = await db.users.find_one({"_id": ObjectId(attempt["candidate_id"])})
        if not candidate:
            continue
            
        results.append({
            "attempt_id": str(attempt["_id"]),
            "candidate_name": candidate.get("full_name", "Unknown"),
            "candidate_email": candidate.get("email", "Unknown"),
            "status": attempt.get("status"),
            "snapshot_url": attempt.get("initial_snapshot_url") # The Cloudinary image for Admin HR!
        })
        
    return results