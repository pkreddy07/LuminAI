from fastapi import APIRouter, HTTPException, status, Request  # pyright: ignore[reportMissingImports]
from pydantic import BaseModel, EmailStr
from app.schemas.database import User, CandidateProfile, OtpRequest
from app.core.security import get_password_hash, verify_password, create_access_token
from datetime import timedelta, datetime
from typing import Optional
import os
import random
import secrets
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
from pathlib import Path

# This forces Python to look for .env in the root of the 'backend' folder
# regardless of where you run the uvicorn command from.
env_path = Path(__file__).resolve().parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

router = APIRouter()

# ... rest of your auth.py file remains exactly the same ...

class UserRegister(BaseModel):
    email: str
    email: str
    password: str
    role: str
    username: str

# ADD THIS NEW CLASS
class UserLogin(BaseModel):
    email: str
    password: str
    role: str

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

def _allow_dev_otp() -> bool:
    # FORCING TO FALSE: This guarantees the OTP is NEVER sent to the frontend.
    # It forces the system to use SMTP emails.
    return False

def _send_otp_email(to_email: str, otp: str):
    host = os.getenv("SMTP_HOST", "sandbox.smtp.mailtrap.io")
    port = int(os.getenv("SMTP_PORT", "2525"))
    user = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM", "no-reply@lumin.ai")

    if not host or not user or not password:
        raise RuntimeError("SMTP is not configured properly in .env.")

    msg = EmailMessage()
    msg["Subject"] = "Your Lumin.ai login code"
    msg["From"] = sender
    msg["To"] = to_email
    msg.set_content(
        f"Your OTP is {otp}. It expires in 10 minutes.\n\n"
        "If you did not request this, you can ignore this email."
    )

    try:
        # Connect to Mailtrap without forcing TLS encryption
        with smtplib.SMTP(host, port) as server:
            # Turn on debug mode to print the raw SMTP network logs to the terminal!
            server.set_debuglevel(1)
            
            server.login(user, password)
            server.send_message(msg)
            
    except Exception as e:
        print(f"❌ SMTP Error Details: {type(e).__name__} - {str(e)}")
        raise RuntimeError(f"Email failed: {str(e)}")

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


@router.post("/request-otp")
async def request_otp(request: Request, payload: OtpRequestPayload):
    db = request.app.mongodb
    channel, contact = _resolve_contact(payload)

    if payload.role not in {"admin", "candidate"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    if payload.role == "admin" and channel == "phone":
        raise HTTPException(status_code=400, detail="Admin login requires email")

    # 🛑 CRITICAL FIX: Ensure the user is registered BEFORE sending OTP
    existing_user = await db.users.find_one({"email": payload.email}) if payload.email else await db.users.find_one({"phone_number": payload.phone_number})
    
    if not existing_user:
        raise HTTPException(status_code=404, detail="Account not found. Please register first.")

    otp = _generate_otp()

    print(f"\n==========================================")
    print(f"🔔 [LUMIN.AI] OTP for {contact} is: {otp}")
    print(f"==========================================\n")

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
        except Exception as e:
            print(f"⚠️ SMTP Warning: {str(e)}")
            pass
    else:
        raise HTTPException(status_code=501, detail="SMS provider not configured")

    return {"message": "OTP processed successfully"}

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


@router.post("/login")
async def login_with_password(request: Request, credentials: UserLogin):
    db = request.app.mongodb

    # 1. Find the user by email
    db_user = await db.users.find_one({"email": credentials.email, "role": credentials.role})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")

    # 2. Verify the password
    if not verify_password(credentials.password, db_user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect password")

    # 3. Check profile completeness (for candidates)
    profile_complete = True
    if credentials.role == "candidate":
        profile = await db.candidate_profiles.find_one({"user_id": str(db_user["_id"])})
        profile_complete = bool(profile and profile.get("district") and profile.get("city"))

    # 4. Generate the JWT Token
    access_token_expires = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440)))
    access_token = create_access_token(
        data={
            "sub": db_user["email"],
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
        "profile_complete": profile_complete
    }