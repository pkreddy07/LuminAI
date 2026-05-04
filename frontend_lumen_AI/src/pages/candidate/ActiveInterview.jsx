import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { getAuth } from '../../lib/auth';

export default function ActiveInterview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const auth = getAuth();
  const videoRef = useRef(null);
  const [stage, setStage] = useState('snapshot');
  const [attemptId, setAttemptId] = useState(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finalScores, setFinalScores] = useState(null);

  const questions = [
    { type: 'Predefined', text: 'ಪೈಪ್ ಸೋರಿಕೆಯಾಗುತ್ತಿರುವಾಗ ನೀವು ಅದನ್ನು ಹೇಗೆ ಸರಿಪಡಿಸುತ್ತೀರಿ?', english: 'How do you fix a leaking pipe?' },
    { type: 'AI Resume-Based', text: 'ನಿಮ್ಮ ರೆಸ್ಯೂಮ್ ಪ್ರಕಾರ, ನೀವು ಗಾರ್ಡನ್ ಸಿಟಿಯಲ್ಲಿ 3 ವರ್ಷ ಕೆಲಸ ಮಾಡಿದ್ದೀರಿ. ಅಲ್ಲಿನ ದೊಡ್ಡ ಸವಾಲು ಏನು?', english: 'According to your resume, you worked at Garden City for 3 years. What was the biggest challenge there?' },
    { type: 'Predefined', text: 'ಸುರಕ್ಷತಾ ಸಾಧನಗಳನ್ನು (PPE) ಧರಿಸುವುದು ಏಕೆ ಮುಖ್ಯ?', english: 'Why is it important to wear safety equipment (PPE)?' }
  ];

  useEffect(() => {
    if (!auth?.token) {
      navigate('/');
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError('Camera access is required to start the interview.'));
  }, [auth?.token, navigate]);

  const captureSnapshot = async () => {
    const video = videoRef.current;
    if (!video) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  };

  const handleSnapshotStart = async () => {
    setError('');
    setStatusMessage('Assigning the best AI for you...');
    setStage('assigning');

    try {
      const snapshot = await captureSnapshot();
      if (!snapshot) throw new Error('Unable to capture snapshot');

      const formData = new FormData();
      formData.append('job_id', id);
      formData.append('snapshot', snapshot, 'snapshot.jpg');

      const response = await apiFetch('/api/candidate/interviews/start', {
        method: 'POST',
        token: auth.token,
        body: formData,
        isForm: true
      });

      setAttemptId(response.attempt_id);
      setStage('face-check');
      setStatusMessage('Verifying identity with live camera...');

      setTimeout(() => runFaceCheck(response.attempt_id), 5000);
    } catch (err) {
      if (err.status === 409) {
        setError('You have already attended this interview.');
      } else {
        setError(err.message || 'Unable to start interview');
      }
      setStage('blocked');
    }
  };

  const runFaceCheck = async (attempt) => {
    try {
      const snapshot = await captureSnapshot();
      if (!snapshot) throw new Error('Unable to capture snapshot');

      const formData = new FormData();
      formData.append('attempt_id', attempt);
      formData.append('snapshot', snapshot, 'live.jpg');

      const response = await apiFetch('/api/candidate/interviews/verify-face', {
        method: 'POST',
        token: auth.token,
        body: formData,
        isForm: true
      });

      if (!response.match) {
        setError('Face verification failed. Please contact the interviewer.');
        setStage('blocked');
        return;
      }

      setStage('interview');
      setStatusMessage('');
    } catch (err) {
      setError(err.message || 'Face verification failed.');
      setStage('blocked');
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }

    setStage('finishing');
    setStatusMessage('Uploading and analyzing your interview...');

    try {
      const formData = new FormData();
      formData.append('attempt_id', attemptId);
      const response = await apiFetch('/api/candidate/interviews/complete', {
        method: 'POST',
        token: auth.token,
        body: formData,
        isForm: true
      });
      setFinalScores(response.scores || null);
      setTimeout(() => navigate('/candidate'), 4000);
    } catch (err) {
      setError(err.message || 'Failed to complete interview');
      setStage('blocked');
    }
  };

  if (stage === 'finishing') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-semibold">Interview finished</h2>
        <p className="text-sm text-slate-300 mt-2">{statusMessage}</p>
        {finalScores && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4 text-left text-sm">
            <p>Confidence: {finalScores.confidence_score}</p>
            <p>Communication: {finalScores.communication_score}</p>
            <p>Body language: {finalScores.body_language_score}</p>
            <p>Overall: {finalScores.overall_score}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="w-full bg-black/70 p-4 flex justify-between items-center border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${hasStarted ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></div>
          <span className="text-sm font-semibold">
            {hasStarted ? 'Interview in progress' : 'Camera ready'}
          </span>
        </div>
        <span className="bg-white/10 text-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
          {hasStarted ? `Question ${currentIndex + 1} of ${questions.length}` : 'Setup'}
        </span>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-50" playsInline autoPlay muted />

        {stage !== 'interview' && (
          <div className="relative z-10 w-full max-w-xl px-6 text-center">
            <div className="bg-black/70 border border-white/10 rounded-3xl p-6">
              <h2 className="text-xl font-semibold">{stage === 'snapshot' ? 'Take a quick photo to begin' : 'One moment'}</h2>
              <p className="text-sm text-slate-300 mt-2">
                {error || statusMessage || 'We will verify your identity before starting.'}
              </p>
              {stage === 'snapshot' && (
                <button
                  onClick={handleSnapshotStart}
                  className="mt-6 bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-full"
                >
                  Take photo and start
                </button>
              )}
              {stage === 'blocked' && (
                <button
                  onClick={() => navigate('/candidate')}
                  className="mt-6 bg-white/10 text-white px-6 py-3 rounded-full"
                >
                  Back to dashboard
                </button>
              )}
            </div>
          </div>
        )}

        {stage === 'interview' && (
          <div className="relative z-10 w-full max-w-2xl px-4 mt-auto mb-8">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 md:p-8 rounded-3xl shadow-2xl text-center">
              <span className="inline-block bg-emerald-400/80 text-slate-950 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                {questions[currentIndex].type} Question
              </span>
              <h2 className="text-xl md:text-3xl font-semibold text-white leading-snug">
                "{questions[currentIndex].text}"
              </h2>
              <p className="text-slate-300 text-sm mt-4 font-medium italic">
                ({questions[currentIndex].english})
              </p>
            </div>
          </div>
        )}

        {stage === 'interview' && (
          <div className="relative z-10 w-full p-6 flex justify-center bg-gradient-to-t from-black to-transparent mt-auto">
            {!hasStarted ? (
              <button
                onClick={() => setHasStarted(true)}
                className="bg-emerald-400 text-slate-950 px-8 py-4 rounded-full font-semibold text-lg hover:bg-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all"
              >
                Begin interview
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-transform hover:scale-105 shadow-xl"
              >
                {currentIndex === questions.length - 1 ? 'Finish interview' : 'Next question'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}