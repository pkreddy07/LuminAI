from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.core.security import get_current_user
from app.services.face_auth import decode_base64_image, get_face_vector, upload_snapshot_to_cloudinary, compare_face_vectors
from app.schemas.database import InterviewAttempt
from bson import ObjectId

router = APIRouter()

class StartInterviewRequest(BaseModel):
    job_id: str
    webcam_base64: str 

class VerifyAttendanceRequest(BaseModel):
    webcam_base64: str 

# ---------------------------------------------------------
# TASK 1: START & DEDUPLICATION (The Pre-Interview Check)
# ---------------------------------------------------------
@router.post("/start", status_code=201)
async def start_interview(
    request: Request, 
    payload: StartInterviewRequest, 
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can enter")

    db = request.app.mongodb
    candidate_id = current_user["user_id"]

    # Check if job exists
    job = await db.job_postings.find_one({"_id": ObjectId(payload.job_id), "is_active": True})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or inactive")

    # Decode image and extract Face Vector
    try:
        img = decode_base64_image(payload.webcam_base64)
        current_face_vector = get_face_vector(img)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # --- TASK 1: THE DEEP DUPLICATE CHECK ---
    all_past_attempts = await db.interview_attempts.find({"job_id": payload.job_id}).to_list(length=None)
    
    for past_attempt in all_past_attempts:
        past_vector = past_attempt.get("reference_face_vector")
        if past_vector and compare_face_vectors(past_vector, current_face_vector):
            raise HTTPException(
                status_code=403, 
                detail="FRAUD ALERT: A candidate with this face has already taken this specific interview."
            )

    # SECURE BACKEND UPLOAD TO CLOUDINARY
    try:
        snapshot_url = upload_snapshot_to_cloudinary(payload.webcam_base64)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

    # Create Attempt
    new_attempt = InterviewAttempt(
        candidate_id=candidate_id,
        job_id=payload.job_id,
        initial_snapshot_url=snapshot_url, 
        status="In-Progress"
    )
    
    attempt_dict = new_attempt.model_dump(by_alias=True, exclude={"id"})
    attempt_dict["reference_face_vector"] = current_face_vector 
    result = await db.interview_attempts.insert_one(attempt_dict)

    return {
        "message": "Identity verified. Interview started.",
        "attempt_id": str(result.inserted_id),
        "snapshot_url": snapshot_url
    }

# ---------------------------------------------------------
# TASK 2: VERIFY ATTENDANCE (Live In-Interview Check)
# ---------------------------------------------------------
@router.post("/{attempt_id}/verify", status_code=200)
async def verify_attendance(
    request: Request, 
    attempt_id: str, 
    payload: VerifyAttendanceRequest, 
    current_user: dict = Depends(get_current_user)
):
    db = request.app.mongodb
    
    attempt = await db.interview_attempts.find_one({"_id": ObjectId(attempt_id)})
    if not attempt:
        raise HTTPException(status_code=404, detail="Interview attempt not found")
        
    reference_vector = attempt.get("reference_face_vector")
    
    try:
        img = decode_base64_image(payload.webcam_base64)
        video_face_vector = get_face_vector(img)
    except ValueError as e:
        return {"status": "failed", "message": f"Could not detect clear face: {str(e)}"}

    is_match = compare_face_vectors(reference_vector, video_face_vector)
    
    if not is_match:
        await db.interview_attempts.update_one(
            {"_id": ObjectId(attempt_id)},
            {"$set": {"status": "Compromised - Imposter Detected"}}
        )
        return {"status": "fraud", "message": "Imposter detected! The person in the video does not match the initial snapshot."}
        
    return {"status": "success", "message": "Candidate attendance verified."}