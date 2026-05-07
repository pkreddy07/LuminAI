import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb+srv://mrpkreddy07:Pranav%402007@luminai.a55onpu.mongodb.net/lumin_ai_open?authSource=admin&retryWrites=true&w=majority')
    db = client['lumin_ai_open']
    attempts = await db.interview_attempts.find().to_list(100)
    print(f'Total attempts in DB: {len(attempts)}')
    for a in attempts:
        print(f"ID: {a.get('_id')}, Job: {a.get('job_id')}, Status: {a.get('status')}")

asyncio.run(main())
