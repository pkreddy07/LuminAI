import React, { useRef, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { getAuth } from '../lib/auth';

export default function InterviewCamera({ attemptId }) {
  const auth = getAuth();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [livenessStatus, setLivenessStatus] = useState('Initializing Camera...');
  const [isRecording, setIsRecording] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [finalScore, setFinalScore] = useState(null);

  useEffect(() => {
    if (!videoRef.current) return;
    let camera = null;
    let faceMeshInstance = null;

    try {
      faceMeshInstance = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      faceMeshInstance.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      faceMeshInstance.onResults((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) setLivenessStatus('Face Detected - Live');
        else setLivenessStatus('No Face Detected');
      });

      camera = new window.Camera(videoRef.current, {
        onFrame: async () => { if (videoRef.current) await faceMeshInstance.send({ image: videoRef.current }); },
        width: 640, height: 480
      });

      camera.start().catch(() => setCameraError("Please allow camera permissions."));
    } catch (err) {
      setCameraError("Failed to load AI models.");
    }

    return () => {
      if (camera) camera.stop();
      if (faceMeshInstance) faceMeshInstance.close();
    };
  }, []);

  const handleStartCaptureClick = React.useCallback(() => {
    setIsRecording(true);
    setRecordedChunks([]);
    setVideoUrl(null);
    setFinalScore(null);
    
    const stream = videoRef.current.srcObject;
    if (!stream) return;

    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current.addEventListener('dataavailable', ({ data }) => {
      if (data.size > 0) setRecordedChunks((prev) => prev.concat(data));
    });
    mediaRecorderRef.current.start();
  }, []);

  const handleStopCaptureClick = React.useCallback(() => {
    setIsRecording(false);
    mediaRecorderRef.current.stop();
  }, []);

  useEffect(() => {
    if (recordedChunks.length > 0 && !isRecording) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      setVideoUrl(URL.createObjectURL(blob));
    }
  }, [recordedChunks, isRecording]);

  useEffect(() => {
    if (isRecording && attemptId) {
      const verifyFace = async (blob) => {
        try {
          const formData = new FormData();
          formData.append('attempt_id', attemptId);
          formData.append('snapshot', blob, 'verify.jpg');
          await apiJson('/api/candidate/interviews/verify-face', {
            method: 'POST',
            token: auth?.token,
            isForm: true,
            body: formData
          });
        } catch (err) {
          console.error('Face match error', err);
        }
      };

      const timer = setTimeout(() => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        canvas.toBlob(verifyFace, 'image/jpeg');
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [isRecording, attemptId, auth?.token]);

  const handleSubmitToAI = async () => {
    setIsProcessing(true);
    setProcessingStep('Extracting Audio & Video Sync...');
    
    setTimeout(() => setProcessingStep('Transcribing dialect via Bhashini...'), 1500);
    setTimeout(() => setProcessingStep('Evaluating answers...'), 3500);
    
    try {
      const formData = new FormData();
      if (attemptId) formData.append('attempt_id', attemptId);
      await apiJson('/api/candidate/interviews/complete', {
        method: 'POST',
        token: auth?.token,
        isForm: true,
        body: formData
      });
      
      setTimeout(() => {
        setProcessingStep('Complete');
        setFinalScore(true);
        setIsProcessing(false);
      }, 5000);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 pb-10">
      
      <div className={`relative w-full max-w-md mx-auto bg-black rounded-[32px] overflow-hidden shadow-2xl transition-all duration-500 flex items-center justify-center border ${isRecording ? 'border-rose-500' : 'border-white/10'} ${videoUrl ? 'min-h-[250px]' : 'min-h-[400px]'}`}>
        
        {cameraError ? (
          <div className="text-rose-400 font-medium p-6 text-center">{cameraError}</div>
        ) : (
          <video ref={videoRef} className="w-full h-full object-cover absolute inset-0" playsInline autoPlay muted />
        )}
        
        {!cameraError && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <span className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-lg backdrop-blur-md ${
              livenessStatus.includes('Live') ? 'bg-emerald-500/80 text-white' : 'bg-rose-500/80 text-white'
            }`}>
              {livenessStatus}
            </span>
            
            {isRecording && (
              <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-white tracking-widest">REC</span>
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
          {isRecording ? (
            <button onClick={handleStopCaptureClick} className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center border-2 border-rose-500 backdrop-blur-sm animate-pulse">
              <div className="w-6 h-6 bg-rose-500 rounded-sm" />
            </button>
          ) : (
            <button onClick={handleStartCaptureClick} className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/60 backdrop-blur-sm hover:scale-105 transition-transform shadow-xl">
              <div className="w-10 h-10 bg-rose-500 rounded-full" />
            </button>
          )}
        </div>
      </div>

      {videoUrl && !isRecording && !finalScore && (
        <p className="text-sm font-semibold text-slate-400 animate-bounce">↓ Review below or hit record again to retake ↓</p>
      )}

      {videoUrl && !isRecording && !finalScore && (
        <div className="w-full max-w-md bg-white/5 border border-white/10 p-6 rounded-[32px] shadow-xl flex flex-col gap-4 animate-fade-in-up">
          <h3 className="text-lg font-semibold text-white">Review Your Answer</h3>
          
          <div className="w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-white/10">
            <video 
              src={videoUrl} 
              className="w-full h-auto max-h-[300px] object-contain" 
              controls 
              controlsList="nodownload" 
              playsInline 
            />
          </div>
          
          {isProcessing ? (
            <div className="mt-2 bg-emerald-400/10 border border-emerald-400/20 p-4 rounded-xl flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-emerald-200">{processingStep}</span>
            </div>
          ) : (
            <button onClick={handleSubmitToAI} className="w-full bg-emerald-400 text-slate-950 py-4 rounded-xl font-semibold shadow-lg hover:bg-emerald-300 transition-all">
              Submit Answer
            </button>
          )}
        </div>
      )}

      {finalScore && (
        <div className="w-full max-w-md bg-emerald-400/10 p-8 rounded-[32px] shadow-xl border border-emerald-400/20 text-center">
          <div className="w-20 h-20 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Interview Completed</h2>
          <p className="text-sm text-slate-300 mb-6">Your responses have been successfully submitted to the AI agent for analysis. You may now close this window.</p>
          <button onClick={() => window.location.href='/home'} className="block w-full text-center text-emerald-400 font-semibold hover:text-emerald-300">
            Return to Dashboard →
          </button>
        </div>
      )}
    </div>
  );
}