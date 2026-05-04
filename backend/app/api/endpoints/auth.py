from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from app.schemas.database import User, CandidateProfile, OtpRequest
from app.core.security import get_password_hash, verify_password, create_access_token
from datetime import timedelta, datetime
from email.message import EmailMessage
from typing import Optional
import os
import random
import secrets
import smtplib

router = APIRouter()

# Payloads expected from the Frontend
class UserRegister(BaseModel):
    email: str # Can be modified later to accept phone numbers too
    password: str
    role: str # 'admin' or 'candidate'
    username: str

class UserLogin(BaseModel):
    email: str
    password: str

class OtpRequestPayload(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    role: str

class OtpVerifyPayload(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    role: str
    otp: str
    username: Optional[str] = None

def _generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"

def _send_otp_email(to_email: str, otp: str):
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM", user or "no-reply@lumin.ai")

    if not host or not user or not password:
        raise RuntimeError("SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD.")

    msg = EmailMessage()
    msg["Subject"] = "Your Lumin.ai login code"
    msg["From"] = sender
    msg["To"] = to_email
    msg.set_content(
        f"Your OTP is {otp}. It expires in 10 minutes.\n\n"
        "If you did not request this, you can ignore this email."
    )

    with smtplib.SMTP(host, port) as server:
        server.starttls()
        server.login(user, password)
        server.send_message(msg)

def _resolve_contact(payload: OtpRequestPayload | OtpVerifyPayload):
    if payload.email:
        return "email", payload.email
    if payload.phone_number:
        return "phone", payload.phone_number
    raise HTTPException(status_code=400, detail="Email or phone number is required")

def _otp_expires_at() -> datetime:
    return datetime.utcnow() + timedelta(minutes=10)

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: Request, user_data: UserRegister):
    db = request.app.mongodb
    
    # 1. Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Hash the password and create the User object
    hashed_pw = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pw,
        role=user_data.role,
        username=user_data.username
    )
    
    # 3. Insert into MongoDB (exclude 'id' so Mongo generates the _id automatically)
    user_dict = new_user.model_dump(by_alias=True, exclude={"id"})
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)

    # 4. If they are a candidate, create an empty CandidateProfile for them
    if user_data.role == "candidate":
        new_profile = CandidateProfile(user_id=user_id)
        await db.candidate_profiles.insert_one(new_profile.model_dump(by_alias=True, exclude={"id"}))

    return {"message": "User created successfully", "user_id": user_id, "role": user_data.role}

@router.post("/login")
async def login(request: Request, user_data: UserLogin):
    db = request.app.mongodb
    
    # 1. Find user in database
    db_user = await db.users.find_one({"email": user_data.email})
    
    # 2. Verify password
    if not db_user or not verify_password(user_data.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # 3. Generate JWT Token
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440)))
    access_token = create_access_token(
        data={
            "sub": db_user["email"], 
            "role": db_user["role"], 
            "user_id": str(db_user["_id"])
        },
        expires_delta=access_token_expires
    )
    
    # Return the token to the frontend
    return {"access_token": access_token, "token_type": "bearer", "role": db_user["role"], "username": db_user["username"]}

@router.post("/request-otp")
async def request_otp(request: Request, payload: OtpRequestPayload):
    db = request.app.mongodb
    channel, contact = _resolve_contact(payload)

    if payload.role not in {"admin", "candidate"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    if payload.role == "admin" and channel == "phone":
        raise HTTPException(status_code=400, detail="Admin login requires email")

    existing_user = await db.users.find_one({"email": payload.email}) if payload.email else await db.users.find_one({"phone_number": payload.phone_number})
    is_new = existing_user is None

    otp = _generate_otp()
    otp_doc = OtpRequest(
        contact=contact,
        channel=channel,
        role=payload.role,
        otp_hash=get_password_hash(otp),
        expires_at=_otp_expires_at()
    )

    await db.otp_requests.insert_one(otp_doc.model_dump(by_alias=True, exclude={"id"}))

    if channel == "email":
        try:
            _send_otp_email(contact, otp)
        except RuntimeError as exc:
            raise HTTPException(status_code=500, detail=str(exc))
    else:
        if os.getenv("ALLOW_DEV_OTP", "false").lower() == "true":
            return {"message": "OTP generated", "is_new": is_new, "dev_otp": otp}
        raise HTTPException(status_code=501, detail="SMS provider not configured")

    return {"message": "OTP sent", "is_new": is_new}

@router.post("/verify-otp")
async def verify_otp(request: Request, payload: OtpVerifyPayload):
    db = request.app.mongodb
    channel, contact = _resolve_contact(payload)

    if payload.role not in {"admin", "candidate"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    otp_docs = await db.otp_requests.find(
        {"contact": contact, "channel": channel, "role": payload.role, "verified": False}
    ).sort("created_at", -1).to_list(length=1)

    if not otp_docs:
        raise HTTPException(status_code=404, detail="OTP not found")

    otp_doc = otp_docs[0]
    if otp_doc["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    if not verify_password(payload.otp, otp_doc["otp_hash"]):
        await db.otp_requests.update_one({"_id": otp_doc["_id"]}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=401, detail="Invalid OTP")

    await db.otp_requests.update_one({"_id": otp_doc["_id"]}, {"$set": {"verified": True}})

    user_query = {"email": payload.email} if payload.email else {"phone_number": payload.phone_number}
    db_user = await db.users.find_one(user_query)
    is_new = db_user is None

    if db_user is None:
        if not payload.username:
            raise HTTPException(status_code=400, detail="Username is required for new users")

        random_password = get_password_hash(secrets.token_urlsafe(24))
        new_user = User(
            email=payload.email,
            phone_number=payload.phone_number,
            hashed_password=random_password,
            role=payload.role,
            username=payload.username
        )
        user_dict = new_user.model_dump(by_alias=True, exclude={"id"})
        result = await db.users.insert_one(user_dict)
        db_user = await db.users.find_one({"_id": result.inserted_id})

        if payload.role == "candidate":
            new_profile = CandidateProfile(user_id=str(result.inserted_id))
            await db.candidate_profiles.insert_one(new_profile.model_dump(by_alias=True, exclude={"id"}))

    profile_complete = True
    if payload.role == "candidate":
        profile = await db.candidate_profiles.find_one({"user_id": str(db_user["_id"])})
        profile_complete = bool(profile and profile.get("district") and profile.get("city"))

    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440)))
    access_token = create_access_token(
        data={
            "sub": db_user.get("email") or db_user.get("phone_number"),
            "role": db_user["role"],
            "user_id": str(db_user["_id"])
        },
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": db_user["role"],
        "username": db_user["username"],
        "user_id": str(db_user["_id"]),
        "is_new": is_new,
        "profile_complete": profile_complete
    }