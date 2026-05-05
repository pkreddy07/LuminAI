import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import InterviewCamera from '../../components/InterviewCamera';

export default function ActiveInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attempt_id');

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center pt-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Active Interview</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">
            Session: {id?.substring(0,8)}
          </p>
        </div>
        <button 
          onClick={() => navigate('/home')}
          className="px-5 py-2.5 bg-white/10 text-white text-sm font-semibold rounded-full border border-white/5 hover:bg-white/20 transition-colors"
        >
          Exit Interview
        </button>
      </div>
      
      <div className="w-full max-w-4xl bg-white/5 rounded-[32px] shadow-2xl border border-white/10 p-8 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Question 1 of 5</h2>
        <p className="text-slate-300 text-lg mb-8 bg-black/40 p-6 rounded-2xl border border-white/5">
          "Can you describe a time when you had to work with a difficult team member? How did you handle the situation and what was the outcome?"
        </p>
        
        <InterviewCamera attemptId={attemptId} />
      </div>
    </div>
  );
}
