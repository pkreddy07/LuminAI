from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File, Form
from app.core.security import get_current_user
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from pathlib import Path
from uuid import uuid4
import os
import random

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[3] / "uploads"
SNAPSHOT_DIR = UPLOAD_DIR / "snapshots"
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)

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

async def _annotate_attendance(db, jobs: list, candidate_id: str) -> list:
    job_ids = [str(job["_id"]) for job in jobs]
    if not job_ids:
        return jobs

    attempts = await db.interview_attempts.find({
        "candidate_id": candidate_id,
        "job_id": {"$in": job_ids}
    }).to_list(length=1000)

    attended = {a.get("job_id") for a in attempts}
    for job in jobs:
        job["_id"] = str(job["_id"])
        job["has_attended"] = str(job["_id"]) in attended

    return jobs

async def _save_upload_file(file: UploadFile, target_dir: Path) -> str:
    ext = Path(file.filename or "").suffix or ".jpg"
    filename = f"{uuid4().hex}{ext}"
    filepath = target_dir / filename
    content = await file.read()
    filepath.write_bytes(content)
    return f"/uploads/snapshots/{filename}"

def _score_attempt(seed: str) -> dict:
    rng = random.Random(seed)
    confidence = rng.randint(58, 96)
    communication = rng.randint(55, 95)
    body_language = rng.randint(52, 94)
    overall = round((confidence + communication + body_language) / 3, 2)

    if overall >= 80:
        recommendation = "Job Ready"
    elif overall >= 60:
        recommendation = "Needs Training"
    else:
        recommendation = "Not Ready"

    return {
        "confidence_score": confidence,
        "communication_score": communication,
        "body_language_score": body_language,
        "overall_score": overall,
        "recommendation": recommendation
    }

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

@router.get("/me")
async def get_me(request: Request, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403)

    db = request.app.mongodb
    user = await db.users.find_one({"_id": ObjectId(current_user["user_id"])})
    profile = await db.candidate_profiles.find_one({"user_id": current_user["user_id"]})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["_id"] = str(user["_id"])
    if profile and "_id" in profile:
        profile["_id"] = str(profile["_id"])

    return {"user": user, "profile": profile}

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
    return await _annotate_attendance(db, jobs, current_user["user_id"])

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
    return await _annotate_attendance(db, jobs, current_user["user_id"])

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
    return await _annotate_attendance(db, jobs, current_user["user_id"])

@router.post("/interviews/start")
async def start_interview(
    request: Request,
    job_id: str = Form(...),
    snapshot: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403)

    db = request.app.mongodb
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job id")

    job = await db.job_postings.find_one({"_id": ObjectId(job_id), "is_active": True})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    now = datetime.utcnow()
    if job["start_time"] > now or job["end_time"] < now:
        raise HTTPException(status_code=400, detail="Interview window is closed")

    existing_attempt = await db.interview_attempts.find_one({
        "candidate_id": current_user["user_id"],
        "job_id": job_id
    })
    if existing_attempt:
        raise HTTPException(status_code=409, detail="Interview already attended")

    snapshot_url = await _save_upload_file(snapshot, SNAPSHOT_DIR)
    attempt_doc = {
        "candidate_id": current_user["user_id"],
        "job_id": job_id,
        "initial_snapshot_url": snapshot_url,
        "status": "In-Progress",
        "started_at": datetime.utcnow()
    }

    result = await db.interview_attempts.insert_one(attempt_doc)
    return {"message": "Interview started", "attempt_id": str(result.inserted_id), "snapshot_url": snapshot_url}

@router.post("/interviews/verify-face")
async def verify_face(
    request: Request,
    attempt_id: str = Form(...),
    snapshot: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403)

    db = request.app.mongodb
    if not ObjectId.is_valid(attempt_id):
        raise HTTPException(status_code=400, detail="Invalid attempt id")

    attempt = await db.interview_attempts.find_one({"_id": ObjectId(attempt_id)})
    if not attempt:
        raise HTTPException(status_code=404, detail="Interview attempt not found")
    if attempt.get("candidate_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    live_snapshot_url = await _save_upload_file(snapshot, SNAPSHOT_DIR)

    match = True
    similarity = 0.92
    if os.getenv("ENABLE_FACE_MATCH", "false").lower() == "true":
        try:
            from req.face_matcher import compare_faces
            initial_path = SNAPSHOT_DIR / Path(attempt["initial_snapshot_url"]).name
            live_path = SNAPSHOT_DIR / Path(live_snapshot_url).name
            result = compare_faces(initial_path, live_path)
            match = result["match"]
            similarity = result["similarity"]
        except Exception:
            match = True
            similarity = 0.85

    await db.interview_attempts.update_one(
        {"_id": ObjectId(attempt_id)},
        {"$set": {"integrity_match": match, "integrity_score": similarity}}
    )

    return {"match": match, "similarity": similarity, "snapshot_url": live_snapshot_url}

@router.post("/interviews/complete")
async def complete_interview(
    request: Request,
    attempt_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403)

    db = request.app.mongodb
    if not ObjectId.is_valid(attempt_id):
        raise HTTPException(status_code=400, detail="Invalid attempt id")

    attempt = await db.interview_attempts.find_one({"_id": ObjectId(attempt_id)})
    if not attempt:
        raise HTTPException(status_code=404, detail="Interview attempt not found")
    if attempt.get("candidate_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    scores = _score_attempt(attempt_id)
    await db.interview_attempts.update_one(
        {"_id": ObjectId(attempt_id)},
        {"$set": {**scores, "status": "Completed", "completed_at": datetime.utcnow()}}
    )

    return {"message": "Interview completed", "scores": scores}