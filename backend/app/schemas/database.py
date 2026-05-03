from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# 1. Base User (Handles Auth for both Admin and Candidate)
class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    hashed_password: str
    role: str # "admin" or "candidate"
    username: str # "What would you like us to call you?"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 2. Candidate Specific Profile Data
class CandidateProfile(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str # Stringified ObjectId of the User
    district: Optional[str] = None
    city: Optional[str] = None
    category: Optional[str] = None # Caste/Category
    resume_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# 3. The Open Job Posting (Created by Admin)
class JobPosting(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    admin_id: str # Stringified ObjectId of the Admin User
    organization_name: str
    title: str
    job_description: str
    preferred_questions: List[str] = []
    ask_category: bool = False
    start_time: datetime
    end_time: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 4. The Interview Attempt (When a candidate clicks "Start")
class InterviewAttempt(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    candidate_id: str
    job_id: str
    initial_snapshot_url: Optional[str] = None
    status: str = Field(default="In-Progress") # In-Progress, Completed, Rejected (Fraud)
    overall_semantic_score: Optional[float] = None
    overall_integrity_score: Optional[float] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

# 5. The Conversational Turn
class InterviewTurn(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    attempt_id: str
    turn_number: int
    candidate_audio_url: str
    candidate_transcript: str
    ai_question_text: str
    semantic_score: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)