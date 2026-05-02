import React, { useRef, useEffect, useState } from 'react';

export default function InterviewCamera() {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [livenessStatus, setLivenessStatus] = useState('Initializing Camera...');
  const [isRecording, setIsRecording] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  // Demo Processing States
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
    setRecordedChunks([]); // Clear previous recording chunks
    setVideoUrl(null);     // Clear previous video player
    setFinalScore(null);   // Clear previous AI scores
    
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

  const handleSubmitToAI = () => {
    setIsProcessing(true);
    setProcessingStep('Extracting Audio & Video Sync...');
    setTimeout(() => setProcessingStep('Transcribing dialect via Bhashini...'), 1500);
    setTimeout(() => setProcessingStep('RAG Search against Skill DB...'), 3500);
    setTimeout(() => setProcessingStep('Evaluating Confidence & Clarity...'), 5000);
    setTimeout(() => {
      setProcessingStep('Complete');
      setFinalScore({ score: 88, fitment: 'Deployment-Ready' });
      setIsProcessing(false);
    }, 6500);
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 pb-10">
      
      {/* Main Camera Box - Now ALWAYS visible */}
      <div className={`relative w-full max-w-md mx-auto bg-gray-900 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 flex items-center justify-center border-4 ${isRecording ? 'border-red-500' : 'border-gray-800'} ${videoUrl ? 'min-h-[250px]' : 'min-h-[400px]'}`}>
        
        {cameraError ? (
          <div className="text-red-400 font-medium p-6 text-center">{cameraError}</div>
        ) : (
          <video ref={videoRef} className="w-full h-full object-cover absolute inset-0" playsInline autoPlay muted />
        )}
        
        {/* Top Overlays */}
        {!cameraError && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-lg backdrop-blur-md ${
              livenessStatus.includes('Live') ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
            }`}>
              {livenessStatus}
            </span>
            
            {isRecording && (
              <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-white tracking-widest">REC</span>
              </div>
            )}
          </div>
        )}

        {/* Bottom Controls */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
          {isRecording ? (
            <button onClick={handleStopCaptureClick} className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500 backdrop-blur-sm animate-pulse">
              <div className="w-6 h-6 bg-red-500 rounded-sm" /> {/* Square stop icon */}
            </button>
          ) : (
            <button onClick={handleStartCaptureClick} className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center border-4 border-white backdrop-blur-sm hover:scale-105 transition-transform shadow-xl">
              <div className="w-10 h-10 bg-red-500 rounded-full" /> {/* Circle record icon */}
            </button>
          )}
        </div>
      </div>

      {/* Helper text for multiple attempts */}
      {videoUrl && !isRecording && !finalScore && (
        <p className="text-sm font-bold text-gray-500 animate-bounce">↓ Review below or hit record again to retake ↓</p>
      )}

      {/* Review & Submit Section */}
      {videoUrl && !isRecording && !finalScore && (
        <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col gap-4 animate-fade-in-up">
          <h3 className="text-lg font-bold text-gray-800">Review Your Answer</h3>
          
          {/* Native Video Player with controlsList="nodownload" */}
          <div className="w-full rounded-2xl overflow-hidden bg-black shadow-inner">
            <video 
              src={videoUrl} 
              className="w-full h-auto max-h-[300px] object-contain" 
              controls 
              controlsList="nodownload" 
              playsInline 
            />
          </div>
          
          {isProcessing ? (
            <div className="mt-2 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-semibold text-blue-700">{processingStep}</span>
            </div>
          ) : (
            <button onClick={handleSubmitToAI} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-all">
              Submit to Lumin.ai ✨
            </button>
          )}
        </div>
      )}

      {/* Final Results State */}
      {finalScore && (
        <div className="w-full max-w-md bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-3xl shadow-xl border border-green-100 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full blur-3xl" />
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Assessment Scored!</h2>
          <div className="bg-white py-4 px-6 rounded-2xl shadow-sm inline-block mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fitment Status</p>
            <p className="text-lg font-black text-green-600">{finalScore.fitment}</p>
            <p className="text-sm font-medium text-gray-500 mt-2">Confidence: <span className="font-bold text-gray-800">{finalScore.score}%</span></p>
          </div>
          <button onClick={() => window.location.href='/admin'} className="block w-full text-center text-indigo-600 font-bold hover:underline">
            View in Admin Dashboard →
          </button>
        </div>
      )}
    </div>
  );
}