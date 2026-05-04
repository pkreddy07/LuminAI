import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ActiveInterview() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  
  const questions = [
    { type: 'Predefined', text: 'ಪೈಪ್ ಸೋರಿಕೆಯಾಗುತ್ತಿರುವಾಗ ನೀವು ಅದನ್ನು ಹೇಗೆ ಸರಿಪಡಿಸುತ್ತೀರಿ?', english: 'How do you fix a leaking pipe?' },
    { type: 'AI Resume-Based', text: 'ನಿಮ್ಮ ರೆಸ್ಯೂಮ್ ಪ್ರಕಾರ, ನೀವು ಗಾರ್ಡನ್ ಸಿಟಿಯಲ್ಲಿ 3 ವರ್ಷ ಕೆಲಸ ಮಾಡಿದ್ದೀರಿ. ಅಲ್ಲಿನ ದೊಡ್ಡ ಸವಾಲು ಏನು?', english: 'According to your resume, you worked at Garden City for 3 years. What was the biggest challenge there?' },
    { type: 'Predefined', text: 'ಸುರಕ್ಷತಾ ಸಾಧನಗಳನ್ನು (PPE) ಧರಿಸುವುದು ಏಕೆ ಮುಖ್ಯ?', english: 'Why is it important to wear safety equipment (PPE)?' }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(err => console.error("Camera error", err));
  }, []);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(prev => prev + 1);
    else {
      setIsFinished(true);
      setTimeout(() => navigate('/home'), 4000); // Simulate upload then redirect
    }
  };

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-white text-2xl font-bold">Interview Finished!</h2>
        <p className="text-gray-400 mt-2 font-medium">Securely uploading video and sending to Lumin.ai for analysis...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="w-full bg-gray-900 p-4 flex justify-between items-center border-b border-gray-800 z-10">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${hasStarted ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
          <span className="text-white font-bold text-sm">
            {hasStarted ? 'Recording continuously...' : 'Ready to start'}
          </span>
        </div>
        <span className="bg-gray-800 text-blue-400 px-3 py-1 rounded text-xs font-bold">
          {hasStarted ? `Question ${currentIndex + 1} of ${questions.length}` : 'Setup'}
        </span>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-50" playsInline autoPlay muted />

        {hasStarted && (
          <div className="relative z-10 w-full max-w-2xl px-4 mt-auto mb-8 animate-fade-in">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 md:p-8 rounded-3xl shadow-2xl text-center">
              <span className="inline-block bg-blue-600/80 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                {questions[currentIndex].type} Question
              </span>
              <h2 className="text-xl md:text-3xl font-bold text-white leading-snug">
                "{questions[currentIndex].text}"
              </h2>
              <p className="text-gray-300 text-sm mt-4 font-medium italic">
                ({questions[currentIndex].english})
              </p>
            </div>
          </div>
        )}

        <div className="relative z-10 w-full p-6 flex justify-center bg-gradient-to-t from-black to-transparent mt-auto">
          {!hasStarted ? (
            <button onClick={() => setHasStarted(true)} className="bg-blue-600 text-white px-8 py-4 rounded-full font-black text-lg hover:bg-blue-700 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
              Begin Interview & Recording
            </button>
          ) : (
            <button onClick={handleNext} className="bg-white text-black px-8 py-4 rounded-full font-black text-lg hover:bg-gray-200 transition-transform hover:scale-105 shadow-xl">
              {currentIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question ➡️'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}