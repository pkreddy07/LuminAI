import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CandidateHome() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('available');

  const availableInterviews = [
    { id: 101, title: 'Plumbing Technician (Level 2)', window: 'Today, 9:00 AM - 9:00 PM', duration: 'Approx 15 mins', aiMode: 'Resume + Predefined' }
  ];

  const completedInterviews = [
    { id: 102, title: 'Basic Assessment', date: 'Yesterday', status: 'Analysis Complete' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-lg md:text-xl font-black text-gray-900">Lumin<span className="text-blue-600">.ai</span></h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-600 hidden md:block">Welcome, Ramesh</span>
          <button onClick={() => navigate('/')} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-bold hover:bg-gray-200">Logout</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6">
        <h2 className="text-2xl font-black text-gray-800 mb-6">Your Dashboard</h2>

        <div className="flex gap-6 border-b border-gray-200 mb-6">
          <button onClick={() => setTab('available')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${tab === 'available' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
            Available Interviews
          </button>
          <button onClick={() => setTab('completed')} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${tab === 'completed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
            Finished Interviews
          </button>
        </div>

        <div className="space-y-4">
          {tab === 'available' && availableInterviews.map(i => (
            <div key={i.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between gap-4 border-l-4 border-l-blue-500">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{i.title}</h3>
                <p className="text-sm text-gray-500 mt-1">🕒 Window: {i.window}</p>
                <p className="text-sm text-gray-500">⏳ Duration: {i.duration}</p>
                <span className="inline-block mt-3 text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md">
                  AI: {i.aiMode}
                </span>
              </div>
              <button onClick={() => navigate(`/rules/${i.id}`)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 h-fit w-full sm:w-auto self-start sm:self-center">
                Select & Join
              </button>
            </div>
          ))}

          {tab === 'completed' && completedInterviews.map(i => (
            <div key={i.id} className="bg-gray-100 p-5 rounded-2xl border border-gray-200 flex justify-between items-center opacity-80">
              <div>
                <h3 className="font-bold text-gray-700">{i.title}</h3>
                <p className="text-sm text-gray-500 mt-1">Finished on {i.date}</p>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">{i.status}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}