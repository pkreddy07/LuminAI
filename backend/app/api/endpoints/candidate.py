from fastapi import APIRouter, Depends, HTTPException, Request, Query
from app.core.security import get_current_user
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId

router = APIRouter()

# ---------------------------------------------------------
# HELPER: Search Filter Builder
# ---------------------------------------------------------
def build_search_query(q: Optional[str], base_query: dict) -> dict:
    """If the user searches for a skill or company, add a regex search to the query."""
    if not q:
        return base_query
    
    # Case-insensitive search across title, company, and description
    search_condition = {
        "$or": [
            {"organization_name": {"$regex": q, "$options": "i"}},
            {"title": {"$regex": q, "$options": "i"}},
            {"job_description": {"$regex": q, "$options": "i"}}
        ]
    }
    return {**base_query, **search_condition}

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------

@router.put("/profile")
async def update_profile(request: Request, profile_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can update profiles")

    db = request.app.mongodb
    profile_data["updated_at"] = datetime.utcnow()
    
    result = await db.candidate_profiles.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": profile_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    return {"message": "Profile updated successfully"}

@router.get("/jobs/active")
async def get_active_jobs(
    request: Request, 
    q: Optional[str] = Query(None, description="Search by title, company, or skill"), 
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403)

    db = request.app.mongodb
    now = datetime.utcnow()
    
    # Base condition: Currently inside the time window
    base_query = {
        "is_active": True,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now}
    }
    
    final_query = build_search_query(q, base_query)
    jobs = await db.job_postings.find(final_query).to_list(length=100)
    
    for job in jobs: job["_id"] = str(job["_id"])
    return jobs

@router.get("/jobs/recent")
async def get_recent_jobs(
    request: Request, 
    q: Optional[str] = None, 
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403)

    db = request.app.mongodb
    now = datetime.utcnow()
    yesterday = now - timedelta(days=1)
    
    # Base condition: Ended in the last 24 hours
    base_query = {
        "is_active": True,
        "end_time": {"$gte": yesterday, "$lt": now}
    }
    
    final_query = build_search_query(q, base_query)
    jobs = await db.job_postings.find(final_query).to_list(length=100)
    
    for job in jobs: job["_id"] = str(job["_id"])
    return jobs

@router.get("/jobs/attended")
async def get_attended_jobs(
    request: Request, 
    q: Optional[str] = None, 
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403)

    db = request.app.mongodb
    
    # 1. Find all Interview Attempts by this candidate
    attempts = await db.interview_attempts.find({"candidate_id": current_user["user_id"]}).to_list(length=None)
    
    # Extract the job IDs they've taken
    job_ids = [ObjectId(attempt["job_id"]) for attempt in attempts if ObjectId.is_valid(attempt["job_id"])]
    
    if not job_ids:
        return [] # They haven't attended any jobs yet
        
    # 2. Fetch those specific jobs
    base_query = {"_id": {"$in": job_ids}}
    final_query = build_search_query(q, base_query)
    
    jobs = await db.job_postings.find(final_query).to_list(length=100)
    for job in jobs: job["_id"] = str(job["_id"])
    return jobs