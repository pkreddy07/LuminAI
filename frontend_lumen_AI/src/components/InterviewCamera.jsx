import React, { useRef, useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { getAuth } from '../lib/auth';
import InterviewAvatar from './InterviewAvatar';

const INTRO_QUESTION = "Hello, I am Lumin, your AI interviewer. To get started, could you please introduce yourself and tell me about your background?";
const CONCLUDE_MESSAGE = "Thank you for your time. That concludes our interview.";
const DEFAULT_TOTAL_QUESTIONS = 5;
const FALLBACK_QUESTION_BANK = [
  "Can you walk me through a recent project or task you are proud of?",
  "How do you prioritize tasks when you have multiple deadlines?",
  "Tell me about a time you handled a difficult situation at work.",
  "Which skills or tools are you most confident using for this role?",
  "Why are you interested in this position?"
];

export default function InterviewCamera({ attemptId, currentQuestion, onQuestionUpdate }) {
  const auth = getAuth();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const fallbackPlanRef = useRef([INTRO_QUESTION, ...FALLBACK_QUESTION_BANK].slice(0, DEFAULT_TOTAL_QUESTIONS));
  
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [livenessStatus, setLivenessStatus] = useState('Initializing Camera...');
  const [cameraError, setCameraError] = useState(null);
  const [interviewError, setInterviewError] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(DEFAULT_TOTAL_QUESTIONS);

  // Conversational State
  const [hasStarted, setHasStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [manualAnswer, setManualAnswer] = useState('');
  
  // Final state
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalScore, setFinalScore] = useState(null);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionRef = useRef(null);
  const keepListeningRef = useRef(false);

  // 1. Setup Camera and FaceMesh
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
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) setLivenessStatus('Face Detected');
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

  // 2. Setup Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };
      
      recognitionRef.current.onstart = () => {
        // started
      };

      recognitionRef.current.onend = () => {
        // Auto-restart if the user explicitly requested continuous listening.
        if (keepListeningRef.current) {
          // Small debounce to avoid rapid restart loops
          setTimeout(() => {
            if (!keepListeningRef.current) return; // Prevent rogue restart if user clicked Done during the debounce
            try {
              recognitionRef.current.start();
              setIsListening(true);
            } catch (e) {
              if (e.name === 'InvalidStateError') {
                setIsListening(true);
              } else {
                console.warn("Speech recognition auto-restart failed:", e);
                setIsListening(false);
              }
            }
          }, 200);
          return;
        }

        setIsListening(false);
      };

      recognitionRef.current.onerror = (e) => {
        console.warn('SpeechRecognition error', e);
        setIsListening(false);
      };
    }
  }, []);

  // Background Face Verification
  useEffect(() => {
    if (hasStarted && attemptId) {
      const verifyFace = async (blob) => {
        try {
          const formData = new FormData();
          formData.append('attempt_id', attemptId);
          formData.append('snapshot', blob, 'verify.jpg');
          await apiJson('/api/candidate/interviews/verify-face', {
            method: 'POST', token: auth?.token, isForm: true, body: formData
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
  }, [hasStarted, attemptId, auth?.token]);

  // AI Speaking Helper
  const speakAI = (text, onEndCallback) => {
    setIsAiSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Prevent garbage collection bug in Chrome
    window.currentUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    const proVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.lang === 'en-US');
    if (proVoice) utterance.voice = proVoice;
    utterance.rate = 1.0;
    
    const handleEnd = () => {
      setIsAiSpeaking(false);
      if (onEndCallback) onEndCallback();
    };

    utterance.onend = handleEnd;
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      handleEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Start the Interview
  const handleStartInterview = () => {
    if (!attemptId) {
      setInterviewError('Interview session missing. Please return to setup and start again.');
      return;
    }

    setInterviewError('');
    setHasStarted(true);
    setQuestionIndex(1);
    setTotalQuestions(DEFAULT_TOTAL_QUESTIONS);
    if (onQuestionUpdate) {
      onQuestionUpdate({ text: INTRO_QUESTION, index: 1, total: DEFAULT_TOTAL_QUESTIONS, phase: 'in-progress' });
    }
    
    // Start Recording Video
    const stream = videoRef.current.srcObject;
    if (stream) {
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current.addEventListener('dataavailable', ({ data }) => {
        if (data.size > 0) setRecordedChunks((prev) => prev.concat(data));
      });
      mediaRecorderRef.current.start();
    }

    // AI Greeting
    setChatHistory([{ role: 'model', text: INTRO_QUESTION }]);

    speakAI(INTRO_QUESTION, () => {
      startListening();
    });
  };

  const startListening = () => {
    if (!recognitionRef.current || isProcessingAI || isAiSpeaking) {
      setIsListening(false);
      return;
    }
    // mark that user wants continuous listening so onend will auto-restart
    keepListeningRef.current = true;
    setTranscript('');
    
    try { 
      recognitionRef.current.start(); 
      setIsListening(true);
    } catch(e) {
      if (e.name === 'InvalidStateError') {
        // Already listening
        setIsListening(true);
      } else {
        console.warn("Speech recognition failed to start:", e);
        setIsListening(false);
      }
    }
  };

  const submitAnswer = async (answerText) => {
    if (!hasStarted) {
      setInterviewError('Please join the call before sending an answer.');
      return;
    }
    if (!attemptId) {
      setInterviewError('Interview session missing. Please return to setup and start again.');
      return;
    }
    if (recognitionRef.current) {
      // user is submitting, disable auto-restart and stop recognition
      keepListeningRef.current = false;
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    setIsListening(false);
    setIsProcessingAI(true);
    setInterviewError('');

    const userText = (answerText || '').trim() || "(Candidate provided a silent or unintelligible response)";
    const updatedHistory = [...chatHistory, { role: 'user', text: userText }];
    setChatHistory(updatedHistory);

    const fallbackPlan = fallbackPlanRef.current;
    const fallbackTotal = fallbackPlan.length;

    const fallbackResponse = () => {
      const nextIndex = questionIndex + 1;
      if (nextIndex > fallbackTotal) {
        return {
          reply: CONCLUDE_MESSAGE,
          is_complete: true,
          question_index: fallbackTotal,
          total_questions: fallbackTotal
        };
      }

      return {
        reply: fallbackPlan[nextIndex - 1],
        is_complete: false,
        question_index: nextIndex,
        total_questions: fallbackTotal
      };
    };

    try {
      const payload = {
        attempt_id: attemptId,
        message: userText,
        history: chatHistory.map(m => ({ role: m.role, text: m.text }))
      };

      const res = await apiJson('/api/candidate/interviews/chat', {
        method: 'POST',
        token: auth?.token,
        body: payload
      });

      const aiReply = res?.reply || '';
      if (!aiReply.trim()) {
        throw new Error('Empty AI reply');
      }
      const resolvedTotal = res?.total_questions || totalQuestions || fallbackTotal;
      const resolvedIndex = res?.question_index || Math.min(questionIndex + 1, resolvedTotal);

      setChatHistory(prev => [...prev, { role: 'model', text: aiReply }]);
      setIsProcessingAI(false);
      setQuestionIndex(resolvedIndex);
      setTotalQuestions(resolvedTotal);

      if (onQuestionUpdate) {
        onQuestionUpdate({
          text: aiReply,
          index: Math.min(resolvedIndex, resolvedTotal),
          total: resolvedTotal,
          phase: res?.is_complete ? 'complete' : 'in-progress'
        });
      }

      speakAI(aiReply, () => {
        if (res?.is_complete) {
          concludeInterview();
        } else {
          startListening();
        }
      });
    } catch (err) {
      console.error(err);
      const fallback = fallbackResponse();

      setChatHistory(prev => [...prev, { role: 'model', text: fallback.reply }]);
      setIsProcessingAI(false);
      setQuestionIndex(fallback.question_index);
      setTotalQuestions(fallback.total_questions);

      if (onQuestionUpdate) {
        onQuestionUpdate({
          text: fallback.reply,
          index: fallback.question_index,
          total: fallback.total_questions,
          phase: fallback.is_complete ? 'complete' : 'in-progress'
        });
      }

      speakAI(fallback.reply, () => {
        if (fallback.is_complete) {
          concludeInterview();
        } else {
          startListening();
        }
      });
    }
  };

  // Submit Answer to Chat Endpoint
  const isSubmittingRef = useRef(false);
  const handleDoneSpeaking = async () => {
    if (isProcessingAI || isAiSpeaking || !hasStarted || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    
    // user finished speaking; prevent auto-restart while we process the answer
    keepListeningRef.current = false;
    const answerText = transcript;
    setTranscript('');
    
    // Immediately show UI as processing before async handoff
    setIsListening(false);
    setIsProcessingAI(true);
    
    await submitAnswer(answerText);
    isSubmittingRef.current = false;
  };

  const concludeInterview = async () => {
    setIsFinalizing(true);
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();

    // End call UI change
    setTimeout(async () => {
      try {
        const formData = new FormData();
        formData.append('attempt_id', attemptId);
        
        setRecordedChunks(currentChunks => {
          if (currentChunks.length > 0) {
            const blob = new Blob(currentChunks, { type: 'video/webm' });
            formData.append('video', blob, 'interview_recording.webm');
          }
          
          apiJson('/api/candidate/interviews/complete', {
            method: 'POST', token: auth?.token, isForm: true, body: formData
          }).then(() => {
            setFinalScore(true);
            setIsFinalizing(false);
          });
          
          return currentChunks;
        });
      } catch (err) {
        console.error(err);
        setIsFinalizing(false);
      }
    }, 1000);
  };

  return (
    <div className="w-full flex flex-col -mt-8 -mb-10 min-h-[calc(100vh-64px)] bg-[#202124] relative overflow-hidden font-sans">
      
      {/* Main Speaker Screen (AI Avatar) */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-8 pb-24">
        
        {/* The 3D AI Avatar Container */}
        <div className={`relative w-48 h-48 md:w-80 md:h-80 rounded-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-300 z-0 ${
          isAiSpeaking ? 'ring-4 ring-emerald-500 scale-105 shadow-[0_0_80px_rgba(16,185,129,0.3)]' : 'ring-2 ring-white/10'
        }`}>
           <div className="absolute inset-0 w-full h-full">
             <InterviewAvatar currentQuestion={currentQuestion} hideBackground={true} isAiSpeaking={isAiSpeaking} />
           </div>
           
           {/* If AI is thinking, show small spinner overlay on avatar */}
           {isProcessingAI && (
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-10">
               <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
             </div>
           )}
        </div>

        {/* Small Name badge for AI */}
        <div className="absolute bottom-28 left-8 md:bottom-28 md:left-12 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 z-10">
           <span className="text-white font-medium flex items-center gap-2">
             {isAiSpeaking ? <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> : <div className="w-2 h-2 rounded-full bg-slate-500"/>}
             Lumin AI
           </span>
        </div>

        {/* Finalizing Overlay */}
        {isFinalizing && (
           <div className="absolute inset-0 bg-[#202124]/90 z-40 flex flex-col items-center justify-center">
             <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
             <h2 className="text-2xl font-semibold text-white mb-2">Finalizing Call...</h2>
             <p className="text-slate-400">Uploading encrypted recording and running analysis.</p>
           </div>
        )}

        {/* Complete Overlay */}
        {finalScore && (
          <div className="absolute inset-0 bg-[#202124] z-50 flex flex-col items-center justify-center p-8">
             <div className="w-20 h-20 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
               <span className="text-3xl">✨</span>
             </div>
             <h2 className="text-3xl font-semibold text-white mb-4">Interview Completed</h2>
             <p className="text-slate-300 max-w-md text-center mb-8">
               Your responses have been successfully submitted to the AI agent. You may now safely leave the call.
             </p>
             <button onClick={() => window.location.href='/home'} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-medium transition-colors shadow-lg">
               Return to Dashboard
             </button>
          </div>
        )}
      </div>

      {/* Picture-in-Picture (Candidate Video) */}
      <div className={`absolute bottom-24 right-4 md:right-8 w-32 md:w-64 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border transition-colors z-20 ${
        isListening ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-white/20'
      }`}>
         <video ref={videoRef} className="w-full h-full object-cover transform scale-x-[-1]" playsInline autoPlay muted />
         
         {/* Liveness Indicator Overlay */}
         <div className="absolute top-2 right-2">
            <div className={`w-2 h-2 rounded-full ${livenessStatus === 'Face Detected' ? 'bg-emerald-500' : 'bg-rose-500'}`} title={livenessStatus} />
         </div>
         <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] md:text-xs text-white backdrop-blur-md flex items-center gap-2">
           You {isListening && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />}
         </div>
         {cameraError && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-rose-400 text-xs text-center p-2">
             {cameraError}
           </div>
         )}
      </div>

      {/* Transcript + Manual Input */}
      <div className="absolute bottom-24 left-4 md:left-8 right-4 md:right-80 z-20">
        <div className="bg-black/50 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Live transcript</span>
            {!SpeechRecognition && <span className="text-amber-300">Voice input unavailable</span>}
          </div>
          <p className="text-sm text-slate-200 mt-2 min-h-[40px]">
            {isListening && transcript.trim().length === 0 ? 'Listening...' : (transcript || 'Your response will appear here.')}
          </p>
          {interviewError && (
            <p className="text-xs text-rose-300 mt-2">{interviewError}</p>
          )}

          {!SpeechRecognition && !finalScore && !isFinalizing && (
            <div className="mt-3 flex flex-col md:flex-row gap-3">
              <input
                value={manualAnswer}
                onChange={(e) => setManualAnswer(e.target.value)}
                placeholder="Type your answer here"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white"
              />
              <button
                onClick={() => {
                  const answer = manualAnswer;
                  setManualAnswer('');
                  submitAnswer(answer);
                }}
                disabled={!hasStarted || isProcessingAI || isAiSpeaking || manualAnswer.trim().length === 0}
                className="bg-emerald-400 text-slate-950 font-semibold px-5 py-2 rounded-xl disabled:opacity-50"
              >
                Send answer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Bar (Google Meet Style) */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#202124] border-t border-white/10 flex items-center justify-center gap-6 px-6 z-30">
        {!hasStarted && !finalScore ? (
          <button onClick={handleStartInterview} disabled={!!cameraError} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-full font-medium transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            Join Call
          </button>
        ) : !finalScore && !isFinalizing ? (
          <>
            {/* Mic / Speak Toggle */}
            <button 
              onClick={isListening ? handleDoneSpeaking : startListening}
              disabled={isProcessingAI || isAiSpeaking}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                isProcessingAI ? 'bg-amber-500 hover:bg-amber-500 cursor-wait' :
                isListening ? 'bg-white hover:bg-slate-200 text-blue-600 ring-4 ring-white/20' : 
                isAiSpeaking ? 'bg-[#3C4043] opacity-60 cursor-not-allowed' :
                'bg-[#3C4043] hover:bg-[#4d5156]'
              }`}
              title={isProcessingAI ? "Processing..." : isListening ? "Mute / Send Answer" : "Unmute to Speak"}
            >
              {isProcessingAI ? (
                /* Loading Spinner Icon */
                <svg className="w-6 h-6 animate-spin text-white pointer-events-none" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                /* SVG Mic Icon */
                <svg className="w-6 h-6 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-2a5 5 0 01-10 0H3a7.001 7.001 0 006 6.93V17H6v2h8v-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* End Call */}
            <button 
              onClick={concludeInterview} 
              disabled={isProcessingAI || isAiSpeaking}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-colors ${
                isProcessingAI || isAiSpeaking ? 'bg-[#ea4335]/50 cursor-not-allowed' : 'bg-[#ea4335] hover:bg-[#d93025]'
              }`} 
              title="Leave Call"
            >
              {/* SVG Phone Down Icon */}
              <svg className="w-6 h-6 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}