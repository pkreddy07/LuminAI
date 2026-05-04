import os
import time
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def generate_next_question(history: list, candidate_response: str) -> dict:
    """
    history format: [{"role": "user"|"model", "parts": ["text"]}]
    """
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    system_prompt = """
    You are an expert, professional HR interviewer. You are conducting an initial screening interview.
    Keep your responses CONCISE, conversational, and direct (1-2 short sentences max). 
    Do not use markdown. Do not be overly enthusiastic. 
    If the candidate gives a good answer, acknowledge it briefly and ask a follow-up or a new behavioral/technical question.
    If the conversation has reached about 4-5 questions, gracefully conclude the interview by saying "Thank you for your time. That concludes our interview."
    """
    
    # Prepend the system prompt to the history
    messages = [{"role": "user", "parts": [system_prompt]}, {"role": "model", "parts": ["Understood."]}]
    for msg in history:
        messages.append(msg)
        
    if candidate_response:
        messages.append({"role": "user", "parts": [candidate_response]})
        
    try:
        response = model.generate_content(messages)
        reply = response.text.strip()
        is_complete = "concludes our interview" in reply.lower() or "thank you for your time" in reply.lower()
        return {"reply": reply, "is_complete": is_complete}
    except Exception as e:
        print(f"Chat error: {e}")
        return {"reply": "Could you please elaborate on that?", "is_complete": False}

async def analyze_interview_video(video_path: str) -> dict:
    try:
        # 1. Upload file
        uploaded_file = genai.upload_file(path=video_path)
        
        # 2. Wait for processing
        while uploaded_file.state.name == "PROCESSING":
            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)
            
        if uploaded_file.state.name == "FAILED":
            raise Exception("Video processing failed in Gemini.")
            
        # 3. Analyze
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = """
        Analyze this candidate's interview recording. Evaluate their responses, clarity, and body language.
        Return ONLY a JSON response matching exactly this format:
        {
          "confidence_score": 85,
          "communication_score": 90,
          "body_language_score": 80,
          "overall_score": 85,
          "recommendation": "Deployment-Ready"
        }
        For recommendation, choose ONE of: 'Deployment-Ready', 'Needs Training', or 'Rejected'.
        Ensure the output is strictly valid JSON with no markdown wrapping.
        """
        
        response = model.generate_content([uploaded_file, prompt])
        
        # Clean response if markdown formatted
        text = response.text.strip()
        if text.startswith("```json"):
            text = text.replace("```json", "", 1).strip()
        if text.endswith("```"):
            text = text[:-3].strip()
            
        return json.loads(text)
    except Exception as e:
        print(f"Gemini Analysis Error: {e}")
        return {
            "confidence_score": 0,
            "communication_score": 0,
            "body_language_score": 0,
            "overall_score": 0,
            "recommendation": "Needs Training"
        }
