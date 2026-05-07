from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import Response
import os

router = APIRouter()


@router.post("/tts")
async def tts(text: str = Body(...)):
    """Convert text to MP3 audio using edge-tts (free, no API key required)."""
    try:
        import edge_tts
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="edge-tts not installed. Run: pip install edge-tts"
        )

    try:
        voice = os.getenv("SIMLI_TTS_VOICE", "en-US-JennyNeural")
        communicate = edge_tts.Communicate(text, voice)

        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])

        if not chunks:
            raise HTTPException(status_code=500, detail="TTS produced no audio output")

        return Response(content=b"".join(chunks), media_type="audio/mpeg")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")