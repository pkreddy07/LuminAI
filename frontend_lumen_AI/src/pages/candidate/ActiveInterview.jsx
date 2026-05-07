import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import InterviewCamera from '../../components/InterviewCamera';
import LanguageToggle from '../../components/LanguageToggle';
import { getAuth } from '../../lib/auth';
import { useEffect } from 'react';

export default function ActiveInterview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attempt_id');
  const [questionMeta, setQuestionMeta] = useState({
    text: 'Click Join Call to begin your interview.',
    index: 0,
    total: 5,
    phase: 'idle'
  });

  const auth = getAuth();

  useEffect(() => {
    if (!auth?.token) {
      navigate('/');
      return;
    }
    if (auth?.role !== 'candidate') {
      navigate(auth?.role === 'admin' ? '/admin' : '/');
      return;
    }
  }, [auth?.token, auth?.role, navigate]);

  const handleQuestionUpdate = (update) => {
    setQuestionMeta((prev) => ({
      text: update.text ?? prev.text,
      index: update.index ?? prev.index,
      total: update.total ?? prev.total,
      phase: update.phase ?? prev.phase
    }));
  };

  const questionLabel = questionMeta.phase === 'complete'
    ? 'Interview complete'
    : questionMeta.index > 0
      ? `Question ${questionMeta.index} of ${questionMeta.total}`
      : 'Interview ready';

  return (
   <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center pt-8 px-4 sm:px-6 lg:px-8 font-sans">
      
      <div className="absolute top-6 right-6 z-50">
        <LanguageToggle />
      </div>

      {/* HEADER SECTION */}
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
      
      {/* MAIN INTERVIEW CARD */}
      <div className="w-full max-w-4xl bg-white/5 rounded-[32px] shadow-2xl border border-white/10 p-8 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{questionLabel}</h2>

        <p className="text-slate-300 text-lg mb-8 bg-black/40 p-6 rounded-2xl border border-white/5">
          "{questionMeta.text}"
        </p>

        {!attemptId ? (
          <div className="bg-rose-500/10 border border-rose-400/20 rounded-2xl p-5 text-sm text-rose-200">
            <p className="font-semibold">Interview session is missing.</p>
            <p className="mt-2 text-rose-100/80">Please return to setup so we can capture your snapshot and create a valid attempt.</p>
            <button
              onClick={() => navigate(`/rules/${id}`)}
              className="mt-4 bg-rose-400 text-slate-950 font-semibold px-4 py-2 rounded-full"
            >
              Go to interview setup
            </button>
          </div>
        ) : (
          <InterviewCamera
            attemptId={attemptId}
            currentQuestion={questionMeta.text}
            onQuestionUpdate={handleQuestionUpdate}
          />
        )}
      </div>
    </div>
  );
}
