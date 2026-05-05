import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import { getAuth } from '../../lib/auth';

export default function InterviewRules() {
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = getAuth();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('rules');

  useEffect(() => {
    if (step === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          setStream(s);
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => setError('Camera access required.'));
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [step]);

  const handleStart = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setError('');
    setLoading(true);

    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvasRef.current.toBlob(async (blob) => {
      try {
        const formData = new FormData();
        formData.append('job_id', id);
        formData.append('snapshot', blob, 'snapshot.jpg');
        
        const response = await apiJson('/api/candidate/interviews/start', {
          method: 'POST',
          token: auth?.token,
          isForm: true,
          body: formData
        });

        if (stream) stream.getTracks().forEach(t => t.stop());
        
        navigate(`/interview/${id}?attempt_id=${response.attempt_id}`);
      } catch (err) {
        if (err.status === 409) {
          setError('Flag: You have already attended this interview.');
        } else {
          setError(err.message || 'Failed to start interview.');
        }
        setLoading(false);
      }
    }, 'image/jpeg');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white/5 max-w-lg w-full p-6 md:p-8 rounded-[32px] shadow-2xl border border-white/10 text-white">
        <h2 className="text-2xl font-semibold mb-4">Interview Setup</h2>
        
        {step === 'rules' ? (
          <>
            <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-2xl p-4 mb-6">
              <p className="text-sm text-emerald-200 font-medium">
                This interview uses AI to ask predefined questions and questions based on your resume.
              </p>
            </div>

            <ul className="space-y-4 mb-8 text-sm text-slate-300">
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
                Speak clearly. You can answer in your preferred language.
              </li>
            </ul>

            <div className="flex flex-col gap-3 mt-8">
              <button onClick={() => setStep('camera')} className="w-full bg-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl hover:bg-emerald-300 shadow-md">
                I Understand, Enable Camera
              </button>
              <button onClick={() => navigate('/home')} className="w-full text-slate-400 font-semibold py-2 hover:text-slate-200">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-300 mb-4">Please position your face clearly in the frame. We will take a picture to verify your identity before assigning an AI agent.</p>
            
            <div className="rounded-2xl overflow-hidden bg-black aspect-video mb-6 relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {loading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center flex-col z-10 backdrop-blur-sm">
                  <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-sm font-semibold text-emerald-300">Assigning the best AI for you...</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {error && <p className="text-rose-400 text-sm mb-4 font-medium text-center">{error}</p>}

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleStart} 
                disabled={loading || !!error}
                className="w-full bg-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl hover:bg-emerald-300 shadow-md disabled:opacity-50"
              >
                {loading ? 'Starting...' : 'Take Picture & Start Interview'}
              </button>
              <button 
                onClick={() => navigate('/home')} 
                disabled={loading}
                className="w-full text-slate-400 font-semibold py-2 hover:text-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}