from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Connecting to MongoDB Atlas...")
    app.mongodb_client = AsyncIOMotorClient(MONGO_URL)
    app.mongodb = app.mongodb_client.lumin_ai_open # The database name
    print("Successfully connected to MongoDB!")
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

@app.get("/")
async def root():
    return {"message": "Lumin.ai API is running."}