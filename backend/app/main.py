from fastapi import FastAPI
from app.api.endpoints import auth
from app.api.endpoints import admin
from app.api.endpoints import candidate
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import certifi

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Connecting to MongoDB Atlas...")
    try:
        app.mongodb_client = AsyncIOMotorClient(
            MONGO_URL, 
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=30000,  # 30 seconds
            connectTimeoutMS=30000,  # 30 seconds
            retryWrites=True,
            maxPoolSize=10
        )
        app.mongodb = app.mongodb_client.lumin_ai_open  # The database name
        
        # Test the connection during startup
        await app.mongodb.command("ping")
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise
    
    yield
    
    # Shutdown
    print("Closing MongoDB connection...")
    app.mongodb_client.close()

app = FastAPI(title="Lumin.ai Open Marketplace", lifespan=lifespan)

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