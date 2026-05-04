import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function InterviewRules() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full p-6 md:p-8 rounded-3xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 mb-4">Interview Instructions</h2>
        
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800 font-medium">
            This interview uses AI to ask predefined questions and questions based on your resume.
          </p>
        </div>

        <ul className="space-y-4 mb-8 text-sm text-gray-700 font-medium">
          <li className="flex items-start gap-3">
            <span className="text-xl">🎥</span>
            Your video and audio will be recorded continuously once you begin.
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl">🤫</span>
            Ensure you are in a quiet room with good lighting.
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl">🗣️</span>
            Speak clearly. You can answer in Kannada or English.
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl">⏩</span>
            Click "Next Question" when you are done answering. You cannot go back.
          </li>
        </ul>

        <div className="flex flex-col gap-3">
          <button onClick={() => navigate(`/interview/${id}`)} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 shadow-md">
            I Understand, Start Camera
          </button>
          <button onClick={() => navigate('/home')} className="w-full text-gray-500 font-bold py-2 hover:text-gray-800">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}