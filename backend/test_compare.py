import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def main():
    client = AsyncIOMotorClient('mongodb+srv://mrpkreddy07:Pranav%402007@luminai.a55onpu.mongodb.net/lumin_ai_open?authSource=admin&retryWrites=true&w=majority')
    db = client['lumin_ai_open']
    
    attempts = await db.interview_attempts.find({'initial_snapshot_url': {'$regex': '^http'}}).to_list(10)
    if len(attempts) >= 2:
        url1 = attempts[-1]['initial_snapshot_url']
        url2 = attempts[-2]['initial_snapshot_url']
        
        print("URL1:", url1)
        print("URL2:", url2)
        try:
            from LuminAI.backend.req.face_matcher import compare_faces
            result = compare_faces(url1, url2)
            print("Result:", result)
        except Exception as e:
            import traceback
            traceback.print_exc()
            print("ERROR:", e)

asyncio.run(main())
