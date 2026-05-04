from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from app.core.security import get_current_user
from app.services.face_auth import decode_base64_image, get_face_vector, upload_snapshot_to_cloudinary
from app.schemas.database import InterviewAttempt
from bson import ObjectId

router = APIRouter()

class StartInterviewRequest(BaseModel):
    job_id: str
    webcam_base64: str 

@router.post("/start", status_code=201)
async def start_interview(
    request: Request, 
    payload: StartInterviewRequest, 
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Only candidates can enter the interview room")

    db = request.app.mongodb
    candidate_id = current_user["user_id"]

    # 1. Check if the job exists and is active
    job = await db.job_postings.find_one({"_id": ObjectId(payload.job_id), "is_active": True})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer active")

    # 2. FRAUD CHECK: Did they already attempt this?
    existing_attempt = await db.interview_attempts.find_one({
        "candidate_id": candidate_id,
        "job_id": payload.job_id
    })
    if existing_attempt:
        raise HTTPException(status_code=400, detail="You have already attempted this interview.")

    # 3. Decode image, check face math, and upload to Cloudinary
    try:
        # Check math first: If there is no face, it crashes here and saves us a Cloudinary upload!
        img = decode_base64_image(payload.webcam_base64)
        face_vector = get_face_vector(img)
        
        # If face is valid, upload to Cloudinary
        snapshot_url = upload_snapshot_to_cloudinary(payload.webcam_base64)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cloudinary upload failed: {str(e)}")

    # 4. Create the official Attempt Record
    new_attempt = InterviewAttempt(
        candidate_id=candidate_id,
        job_id=payload.job_id,
        initial_snapshot_url=snapshot_url, # Secure Cloudinary URL saved for HR!
        status="In-Progress"
    )
    
    attempt_dict = new_attempt.model_dump(by_alias=True, exclude={"id"})
    attempt_dict["reference_face_vector"] = face_vector 
    
    result = await db.interview_attempts.insert_one(attempt_dict)

    return {
        "message": "Identity verified. Interview started.",
        "attempt_id": str(result.inserted_id),
        "snapshot_url": snapshot_url
    }