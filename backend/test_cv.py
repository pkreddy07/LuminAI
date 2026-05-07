import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
from pathlib import Path
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def main():
    client = AsyncIOMotorClient('mongodb+srv://mrpkreddy07:Pranav%402007@luminai.a55onpu.mongodb.net/lumin_ai_open?authSource=admin&retryWrites=true&w=majority')
    db = client['lumin_ai_open']
    attempt = await db.interview_attempts.find_one({'initial_snapshot_url': {'$exists': True}})
    if attempt:
        url = attempt['initial_snapshot_url']
        print("Testing URL:", url)
        try:
            from LuminAI.backend.req.face_matcher import _read_image
            img = _read_image(url)
            print("Successfully read image of shape", img.shape)
        except Exception as e:
            print("ERROR reading image:", e)

asyncio.run(main())
