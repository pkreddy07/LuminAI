from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from app.schemas.database import JobPosting
from app.core.security import get_current_user
from bson import ObjectId

router = APIRouter()

# ---------------------------------------------------------
# INPUT SCHEMA: What we expect from the React Frontend
# Notice it does NOT ask for admin_id, _id, or created_at
# ---------------------------------------------------------
class JobPostingCreate(BaseModel):
    organization_name: str
    title: str
    job_description: str
    skills: List[str] = []
    preferred_questions: List[str] = []
    ask_category: bool = False
    start_time: datetime
    end_time: datetime

def _require_admin(current_user: dict):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access this endpoint")

def _safe_pct(value: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round((value / total) * 100, 2)

def _to_str_id(doc: Dict) -> Dict:
    doc["_id"] = str(doc["_id"])
    return doc

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------
@router.post("/jobs", status_code=201)
async def create_job_posting(request: Request, job_data: JobPostingCreate, current_user: dict = Depends(get_current_user)):
    # 1. Protection
    _require_admin(current_user)

    db = request.app.mongodb

    # 2. Merge the frontend data with the secure Token data
    # We unpack the frontend payload and inject the user_id from the JWT
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
    _require_admin(current_user)

    db = request.app.mongodb

    # 2. Fetch all active jobs created by THIS specific admin
    cursor = db.job_postings.find({"admin_id": current_user["user_id"], "is_active": True})
    jobs = await cursor.to_list(length=100)

    # 3. Format ObjectIds for JSON
    for job in jobs:
        job["_id"] = str(job["_id"])

    return jobs

@router.get("/dashboard")
async def get_admin_dashboard(request: Request, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    db = request.app.mongodb
    now = datetime.utcnow()

    ongoing_jobs = await db.job_postings.find({
        "admin_id": current_user["user_id"],
        "is_active": True,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now}
    }).to_list(length=100)

    past_jobs = await db.job_postings.find({
        "admin_id": current_user["user_id"],
        "is_active": True,
        "end_time": {"$lt": now}
    }).to_list(length=200)

    ongoing_payload = []
    for job in ongoing_jobs:
        job_id = str(job["_id"])
        current_attendees = await db.interview_attempts.count_documents({
            "job_id": job_id,
            "status": "In-Progress"
        })
        job_doc = _to_str_id(job)
        job_doc["current_attendees"] = current_attendees
        ongoing_payload.append(job_doc)

    past_payload = []
    for job in past_jobs:
        job_id = str(job["_id"])
        total_attended = await db.interview_attempts.count_documents({
            "job_id": job_id,
            "status": "Completed"
        })
        job_doc = _to_str_id(job)
        job_doc["total_attended"] = total_attended
        past_payload.append(job_doc)

    return {"ongoing": ongoing_payload, "past": past_payload}

@router.get("/jobs/{job_id}/stats")
async def get_job_stats(job_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    _require_admin(current_user)
    db = request.app.mongodb

    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job id")

    job = await db.job_postings.find_one({"_id": ObjectId(job_id), "admin_id": current_user["user_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    attempts = await db.interview_attempts.find({"job_id": job_id, "status": "Completed"}).to_list(length=1000)

    total_attended = len(attempts)
    job_ready = len([a for a in attempts if a.get("recommendation") == "Job Ready"])
    needs_training = len([a for a in attempts if a.get("recommendation") == "Needs Training"])
    not_ready = len([a for a in attempts if a.get("recommendation") == "Not Ready"])

    def _avg(key: str) -> float:
        values = [a.get(key) for a in attempts if a.get(key) is not None]
        return round(sum(values) / len(values), 2) if values else 0.0

    return {
        "job_id": job_id,
        "total_attended": total_attended,
        "job_ready_pct": _safe_pct(job_ready, total_attended),
        "needs_training_pct": _safe_pct(needs_training, total_attended),
        "not_ready_pct": _safe_pct(not_ready, total_attended),
        "avg_confidence": _avg("confidence_score"),
        "avg_communication": _avg("communication_score"),
        "avg_body_language": _avg("body_language_score"),
        "avg_overall": _avg("overall_score")
    }

@router.get("/jobs/{job_id}/candidates")
async def get_job_candidates(
    job_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
    district: Optional[str] = Query(None),
    skill: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    q: Optional[str] = Query(None)
):
    _require_admin(current_user)
    db = request.app.mongodb

    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job id")

    job = await db.job_postings.find_one({"_id": ObjectId(job_id), "admin_id": current_user["user_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    attempts = await db.interview_attempts.find({"job_id": job_id}).to_list(length=1000)
    candidate_ids = [a["candidate_id"] for a in attempts]

    if not candidate_ids:
        return []

    user_object_ids = [ObjectId(cid) for cid in candidate_ids if ObjectId.is_valid(cid)]
    users = await db.users.find({"_id": {"$in": user_object_ids}}).to_list(length=1000)
    profiles = await db.candidate_profiles.find({"user_id": {"$in": candidate_ids}}).to_list(length=1000)

    user_map = {str(u["_id"]): u for u in users}
    profile_map = {p["user_id"]: p for p in profiles}

    def _matches(candidate_profile: dict, user_doc: dict) -> bool:
        if district and (candidate_profile.get("district") or "").lower() != district.lower():
            return False
        if language and (candidate_profile.get("language") or "").lower() != language.lower():
            return False
        if category and (candidate_profile.get("category") or "").lower() != category.lower():
            return False
        if skill:
            skill_value = skill.lower()
            primary = (candidate_profile.get("primary_skill") or "").lower()
            skills = [s.lower() for s in candidate_profile.get("skills", [])]
            if skill_value not in skills and skill_value not in primary:
                return False
        if q:
            query = q.lower()
            if query not in (user_doc.get("username") or "").lower() and \
               query not in (user_doc.get("email") or "").lower() and \
               query not in (user_doc.get("phone_number") or "").lower():
                return False
        return True

    payload = []
    for attempt in attempts:
        user_doc = user_map.get(attempt.get("candidate_id"))
        if not user_doc:
            continue
        profile_doc = profile_map.get(attempt.get("candidate_id"), {})
        if not _matches(profile_doc, user_doc):
            continue

        payload.append({
            "candidate_id": attempt.get("candidate_id"),
            "username": user_doc.get("username"),
            "email": user_doc.get("email"),
            "phone_number": user_doc.get("phone_number"),
            "district": profile_doc.get("district"),
            "city": profile_doc.get("city"),
            "language": profile_doc.get("language"),
            "primary_skill": profile_doc.get("primary_skill"),
            "skills": profile_doc.get("skills", []),
            "category": profile_doc.get("category"),
            "resume_url": profile_doc.get("resume_url"),
            "initial_snapshot_url": attempt.get("initial_snapshot_url"),
            "recommendation": attempt.get("recommendation"),
            "confidence_score": attempt.get("confidence_score"),
            "communication_score": attempt.get("communication_score"),
            "body_language_score": attempt.get("body_language_score"),
            "overall_score": attempt.get("overall_score"),
            "integrity_match": attempt.get("integrity_match"),
            "integrity_score": attempt.get("integrity_score"),
            "started_at": attempt.get("started_at"),
            "completed_at": attempt.get("completed_at")
        })

    return payload
