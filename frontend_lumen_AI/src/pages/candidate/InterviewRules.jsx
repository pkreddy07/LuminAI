import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import { getAuth } from '../../lib/auth';
import LanguageToggle from '../../components/LanguageToggle';

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
    if (!auth?.token) {
      navigate('/');
      return;
    }
    if (auth?.role !== 'candidate') {
      navigate(auth?.role === 'admin' ? '/admin' : '/');
      return;
    }

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

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setError('Camera is not ready yet. Please wait a moment and try again.');
      setLoading(false);
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      setError('Unable to capture the snapshot. Please refresh and try again.');
      setLoading(false);
      return;
    }

    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const submitSnapshot = async (snapshotBlob) => {
      if (!snapshotBlob) {
        setError('Snapshot capture failed. Please try again.');
        setLoading(false);
        return;
      }

      try {
        const formData = new FormData();
        formData.append('job_id', id);
        formData.append('snapshot', snapshotBlob, 'snapshot.jpg');

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
        } else if (err.status === 403 && err.message?.includes('Face match detected')) {
          alert(err.message);
          navigate('/home');
        } else {
          setError(err.message || 'Failed to start interview.');
        }
        setLoading(false);
      }
    };

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        submitSnapshot(blob);
        return;
      }

      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      fetch(dataUrl)
        .then((res) => res.blob())
        .then((fallbackBlob) => submitSnapshot(fallbackBlob))
        .catch(() => {
          setError('Snapshot capture failed. Please try again.');
          setLoading(false);
        });
    }, 'image/jpeg');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">

      <div className="absolute top-6 right-6 z-50">
        <LanguageToggle />
      </div>

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
              <button onClick={() => { setError(''); setStep('camera'); }} className="w-full bg-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl hover:bg-emerald-300 shadow-md">
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
                  <p className="text-sm font-semibold text-emerald-300">Verifying user and checking for face similarity...</p>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {error && <p className="text-rose-400 text-sm mb-4 font-medium text-center">{error}</p>}

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleStart} 
                disabled={loading}
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