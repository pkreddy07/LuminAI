import React from 'react';
import { Link } from 'react-router-dom';
import InterviewCamera from '../components/InterviewCamera';

export default function CandidateInterview() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      
      {/* App Header */}
      <header className="w-full bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-lg leading-none">L</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-gray-900">Lumin<span className="text-blue-600">.ai</span></h1>
        </div>
        <Link to="/admin" className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
          Admin Login
        </Link>
      </header>

      <main className="w-full max-w-md flex-1 flex flex-col px-4 pt-6">
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            <span>Plumber Assessment</span>
            <span>1 / 5</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full w-1/5 transition-all duration-500"></div>
          </div>
        </div>

        {/* Dynamic Question Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-8 rounded-3xl shadow-xl mb-8 text-center relative overflow-hidden">
          {/* Decorative background shapes */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
          
          <p className="text-blue-200 text-sm font-medium mb-3 relative z-10">Please answer in Kannada or English</p>
          <h2 className="text-2xl font-bold text-white leading-snug relative z-10">
            "ಪೈಪ್ ಸೋರಿಕೆಯಾಗುತ್ತಿರುವಾಗ ನೀವು ಅದನ್ನು ಹೇಗೆ ಸರಿಪಡಿಸುತ್ತೀರಿ?"
          </h2>
          <p className="text-blue-300/80 text-sm mt-4 font-light relative z-10 italic">
            (How do you fix a leaking pipe?)
          </p>
        </div>

        {/* Camera Component */}
        <InterviewCamera />
      </main>
    </div>
  );
}