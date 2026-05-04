from pydantic import BaseModel, Field, EmailStr, ConfigDict
from pydantic.functional_validators import BeforeValidator
from pydantic.functional_serializers import PlainSerializer
from typing import Optional, List, Annotated, Any
from datetime import datetime
from bson import ObjectId

# ---------------------------------------------------------
# PYDANTIC V2 OBJECT_ID HELPER
# ---------------------------------------------------------

def validate_object_id(v: Any) -> ObjectId:
    if isinstance(v, ObjectId):
        return v
    if ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError("Invalid ObjectId")

# This tells Pydantic V2: "Convert strings to ObjectIds for Mongo, and ObjectIds to strings for JSON"
PyObjectId = Annotated[
    ObjectId,
    BeforeValidator(validate_object_id),
    PlainSerializer(lambda x: str(x), return_type=str, when_used="json")
]

# ---------------------------------------------------------
# 1. USERS COLLECTION
# ---------------------------------------------------------
class User(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    hashed_password: str
    role: str = Field(..., description="'admin' or 'candidate'")
    username: str = Field(..., description="What the user wants to be called")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

# ---------------------------------------------------------
# 2. CANDIDATE PROFILES COLLECTION
# ---------------------------------------------------------
class CandidateProfile(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    district: Optional[str] = None
    city: Optional[str] = None
    language: Optional[str] = None
    primary_skill: Optional[str] = None
    skills: List[str] = []
    category: Optional[str] = None
    resume_url: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

# ---------------------------------------------------------
# 3. JOB POSTINGS COLLECTION
# ---------------------------------------------------------
class JobPosting(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    admin_id: str
    organization_name: str
    title: str
    job_description: str
    skills: List[str] = []
    preferred_questions: List[str] = []
    ask_category: bool = False
    start_time: datetime
    end_time: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

# ---------------------------------------------------------
# 4. INTERVIEW ATTEMPTS COLLECTION
# ---------------------------------------------------------
class InterviewAttempt(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    candidate_id: str
    job_id: str
    initial_snapshot_url: Optional[str] = None
    status: str = Field(default="In-Progress")
    confidence_score: Optional[float] = None
    communication_score: Optional[float] = None
    body_language_score: Optional[float] = None
    overall_score: Optional[float] = None
    recommendation: Optional[str] = None
    integrity_match: Optional[bool] = None
    integrity_score: Optional[float] = None
    overall_semantic_score: Optional[float] = None
    overall_integrity_score: Optional[float] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

# ---------------------------------------------------------
# 5. INTERVIEW TURNS COLLECTION
# ---------------------------------------------------------
class InterviewTurn(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    attempt_id: str
    turn_number: int
    candidate_audio_url: str
    candidate_transcript: str
    ai_question_text: str
    semantic_score: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

# ---------------------------------------------------------
# 6. OTP REQUESTS COLLECTION
# ---------------------------------------------------------
class OtpRequest(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    contact: str
    channel: str = Field(..., description="'email' or 'phone'")
    role: str = Field(..., description="'admin' or 'candidate'")
    otp_hash: str
    expires_at: datetime
    attempts: int = 0
    verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)
