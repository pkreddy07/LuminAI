from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from app.schemas.database import User, CandidateProfile
from app.core.security import get_password_hash, verify_password, create_access_token
from datetime import timedelta
import os

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