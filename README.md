# 🌟 Lumin.ai - The Intelligent, Secure, & Interactive Interview Platform

> **A Next-Generation AI Interviewer that automates technical screening while maintaining human-like interaction and strict academic integrity.**

---

## 💡 The Problem
In today's fast-paced hiring environment, recruiters spend countless hours conducting preliminary screening interviews. Traditional asynchronous video interviews are static, awkward for candidates, and easily gamified. Furthermore, ensuring that the person taking the interview is who they claim to be—and hasn't already attempted the interview under a different alias—is a massive challenge for remote assessments.

## 🚀 Our Solution: Lumin.ai
Lumin.ai is a fully autonomous, interactive AI interview platform designed to conduct dynamic screening interviews. It features a real-time conversational AI avatar that asks context-aware questions based on the specific job description, evaluates the candidate's responses on the fly, and generates comprehensive performance reports for the hiring manager.

### ✨ Key Features

*   🤖 **Interactive AI Avatar:** Powered by **Simli AI** and **Google Gemini**, our virtual interviewer engages candidates in natural, spoken dialogue, asking targeted questions and responding dynamically to their answers.
*   🛡️ **Advanced Face-Match Integrity:** No more duplicate attempts. Before an interview begins, the platform takes a snapshot of the candidate and uses **OpenCV** mathematical face-vectoring to cross-reference against all previous attempts. If a candidate tries to take the same interview using a different email address, they are instantly blocked at the door.
*   📊 **Admin Control Room:** A beautiful, dark-mode dashboard for recruiters to create job postings, set strict time windows, and monitor real-time candidate progression.
*   🧠 **Multi-Dimensional AI Evaluation:** Beyond just transcribing answers, Lumin.ai evaluates candidates across four pillars: **Confidence, Communication, Body Language, and Overall Semantic Accuracy**, providing recruiters with a definitive "Hire / No Hire" recommendation.
*   ☁️ **Cloud-Native Storage:** Seamlessly captures, processes, and uploads candidate video feeds and snapshots directly to **Cloudinary** for secure, long-term admin review.

---

## 🛠️ Tech Stack

**Frontend**
*   **React + Vite:** Lightning-fast client rendering.
*   **Tailwind CSS:** Fully responsive, premium glassmorphism dark-mode UI.
*   **Simli AI:** Real-time WebRTC audio-to-face avatar streaming.

**Backend**
*   **Python + FastAPI:** High-performance, asynchronous API routing.
*   **MongoDB (Motor):** Asynchronous NoSQL database for flexible attempt tracking and job schemas.
*   **OpenCV:** Lightweight, lightning-fast facial geometry extraction and matching.
*   **Google Gemini AI:** LLM logic for dynamic question generation and complex candidate response evaluation.
*   **Cloudinary:** Secure media storage and delivery.

---

## ⚙️ Local Setup Instructions

Follow these steps to run the complete platform locally for testing and review.

### 1. Backend Setup (FastAPI)
1. **Navigate to the Backend Directory & Create a Virtual Environment:**
   ```bash
   cd backend
   python -m venv venv
   ```
2. **Activate the Virtual Environment:**
   * **Windows:** `venv\Scripts\activate`
   * **Mac/Linux:** `source venv/bin/activate`
3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Environment Variables:** Create a `.env` file inside the `backend` folder:
   ```env
   MONGO_URL=your_mongodb_connection_string
   SECRET_KEY=your_secure_random_string
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   SMTP_EMAIL=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   
   # Enables the OpenCV Face Matching Check
   ENABLE_FACE_MATCH=true
   ```
5. **Start the Server:**
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup (React/Vite)
1. **Navigate to the Frontend Directory:**
   ```bash
   cd frontend_lumen_AI
   ```
2. **Install Node Dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:** Create a `.env` file inside the `frontend_lumen_AI` folder:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_SIMLI_API_KEY=your_simli_api_key
   VITE_SIMLI_FACE_ID=your_simli_face_id
   ```
4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

---

## 🎯 How to Test

1. **Admin Flow:** Go to `http://localhost:5173`, log in as an Admin, and click **+ Schedule Interview**. Set the time window to include the current time and generate the Interview Link.
2. **Candidate Flow:** Open an Incognito Window, paste the link, and sign up as a Candidate. Go through the onboarding flow, allow camera access, and test the AI Avatar interaction. 
3. **Integrity Check:** Try opening the link *again* in a new browser, sign up with a completely different email, and try to take the picture. The system will detect your face and block the duplicate attempt!

---
*Built with ❤️ for the future of technical hiring.*
