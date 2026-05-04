from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.api.endpoints import auth
from app.api.endpoints import admin
from app.api.endpoints import candidate
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
import os
import secrets
from dotenv import load_dotenv
import certifi
from pathlib import Path
from app.core.security import get_password_hash

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

def _resolve_mongo_client_kwargs(mongo_url: str) -> dict:
    env_override = os.getenv("MONGO_TLS")
    if env_override is not None:
        use_tls = env_override.lower() in {"1", "true", "yes"}
    else:
        use_tls = mongo_url.startswith("mongodb+srv://")

    kwargs = {
        "serverSelectionTimeoutMS": 30000,
        "connectTimeoutMS": 30000,
        "retryWrites": True,
        "maxPoolSize": 10,
    }

    if use_tls:
        kwargs["tlsCAFile"] = certifi.where()

    return kwargs

def _should_seed_dev_data(mongo_url: str) -> bool:
    env_override = os.getenv("SEED_DEV_DATA")
    if env_override is not None:
        return env_override.lower() in {"1", "true", "yes"}
    return mongo_url.startswith("mongodb://localhost") or mongo_url.startswith("mongodb://127.0.0.1")

async def _seed_dev_data(db) -> None:
    existing_jobs = await db.job_postings.count_documents({})
    if existing_jobs > 0:
        return

    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@lumin.ai")
    admin_user = await db.users.find_one({"email": admin_email})
    if not admin_user:
        admin_doc = {
            "email": admin_email,
            "hashed_password": get_password_hash(secrets.token_urlsafe(24)),
            "role": "admin",
            "username": "Demo Admin",
            "created_at": datetime.utcnow()
        }
        result = await db.users.insert_one(admin_doc)
        admin_user = await db.users.find_one({"_id": result.inserted_id})

    admin_id = str(admin_user["_id"])
    now = datetime.utcnow()
    jobs = [
        {
            "admin_id": admin_id,
            "organization_name": "Lumin Retail",
            "title": "Customer Support Associate",
            "job_description": "Handle inbound customer queries and resolve issues with empathy and clarity.",
            "skills": ["Customer Service", "Communication", "CRM"],
            "preferred_questions": [
                "How do you handle an upset customer?",
                "Describe a time you solved a tricky issue."
            ],
            "ask_category": False,
            "start_time": now - timedelta(hours=1),
            "end_time": now + timedelta(hours=3),
            "is_active": True,
            "created_at": now,
            "seed_tag": "dev"
        },
        {
            "admin_id": admin_id,
            "organization_name": "BrightMart",
            "title": "Field Sales Executive",
            "job_description": "Meet retail partners, pitch new SKUs, and close monthly targets.",
            "skills": ["Sales", "Negotiation", "Market Visits"],
            "preferred_questions": [
                "Tell us about your best sales month.",
                "How do you handle a price objection?"
            ],
            "ask_category": False,
            "start_time": now - timedelta(hours=2),
            "end_time": now + timedelta(hours=1),
            "is_active": True,
            "created_at": now,
            "seed_tag": "dev"
        },
        {
            "admin_id": admin_id,
            "organization_name": "Swift Logistics",
            "title": "Warehouse Supervisor",
            "job_description": "Oversee dispatch operations and ensure safety compliance.",
            "skills": ["Operations", "Leadership", "Safety"],
            "preferred_questions": [
                "How do you manage shift handovers?",
                "Describe a safety improvement you led."
            ],
            "ask_category": False,
            "start_time": now - timedelta(hours=6),
            "end_time": now - timedelta(hours=2),
            "is_active": True,
            "created_at": now,
            "seed_tag": "dev"
        },
        {
            "admin_id": admin_id,
            "organization_name": "SparkWorks",
            "title": "Electrician Apprentice",
            "job_description": "Assist senior electricians with installs and troubleshooting.",
            "skills": ["Wiring", "Safety", "Troubleshooting"],
            "preferred_questions": [
                "What safety checks do you do before starting work?",
                "Tell us about a wiring issue you resolved."
            ],
            "ask_category": False,
            "start_time": now + timedelta(hours=2),
            "end_time": now + timedelta(hours=6),
            "is_active": True,
            "created_at": now,
            "seed_tag": "dev"
        }
    ]

    await db.job_postings.insert_many(jobs)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Connecting to MongoDB...")
    try:
        client_kwargs = _resolve_mongo_client_kwargs(MONGO_URL)
        app.mongodb_client = AsyncIOMotorClient(MONGO_URL, **client_kwargs)
        app.mongodb = app.mongodb_client.lumin_ai_open  # The database name
        
        # Test the connection during startup
        await app.mongodb.command("ping")
        print("Successfully connected to MongoDB!")

        if _should_seed_dev_data(MONGO_URL):
            try:
                await _seed_dev_data(app.mongodb)
                print("Seeded demo interview data.")
            except Exception as exc:
                print(f"Failed to seed demo data: {exc}")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise
    
    yield
    
    # Shutdown
    print("Closing MongoDB connection...")
    app.mongodb_client.close()

app = FastAPI(title="Lumin.ai Open Marketplace", lifespan=lifespan)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Essential for connecting Next.js to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin Dashboard"])
app.include_router(candidate.router, prefix="/api/candidate", tags=["Candidate Marketplace"])

@app.get("/")
async def root():
    return {"message": "Lumin.ai API is running."}