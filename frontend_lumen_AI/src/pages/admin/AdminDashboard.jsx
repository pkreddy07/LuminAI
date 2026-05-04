import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // 1. State for Schedules
  const [schedules, setSchedules] = useState([
    { id: 1, trade: 'Plumber', date: '2023-10-24', start: '09:00', end: '21:00', enrolled: 2 },
    { id: 2, trade: 'Electrician', date: '2023-10-25', start: '10:00', end: '18:00', enrolled: 1 }
  ]);

  // 2. State for Tracking Which Schedule is Clicked/Selected
  const [selectedScheduleId, setSelectedScheduleId] = useState(1); // Default select the first one

  // 3. Database of Candidates Mapped to Schedule IDs
  const [candidateResults, setCandidateResults] = useState({
    1: [
      { id: 101, name: 'Ramesh K.', score: 88, status: 'Deployment-Ready', badge: 'bg-green-100 text-green-800' },
      { id: 102, name: 'Suresh M.', score: 65, status: 'Needs Upskilling', badge: 'bg-yellow-100 text-yellow-800' }
    ],
    2: [
      { id: 103, name: 'Lakshmi N.', score: 92, status: 'Deployment-Ready', badge: 'bg-green-100 text-green-800' }
    ]
  });

  // State for the new schedule form
  const [formData, setFormData] = useState({
    trade: 'Plumber',
    date: '',
    start: '09:00',
    end: '21:00'
  });

  const handleCreateSchedule = () => {
    if (!formData.date) {
      alert("Please select a date!");
      return;
    }
    
    const newId = Date.now();
    const newSchedule = {
      id: newId,
      trade: formData.trade,
      date: formData.date,
      start: formData.start,
      end: formData.end,
      enrolled: 0
    };

    // Add to schedules list
    setSchedules([newSchedule, ...schedules]);
    
    // Add an empty array for this new schedule in our results database
    setCandidateResults({ ...candidateResults, [newId]: [] });
    
    // Automatically select the newly created schedule
    setSelectedScheduleId(newId);
    
    // Close and reset
    setShowScheduleModal(false);
    setFormData({ trade: 'Plumber', date: '', start: '09:00', end: '21:00' });
  };

  // Helper to get candidates for the currently selected schedule
  const activeCandidates = candidateResults[selectedScheduleId] || [];
  const selectedScheduleDetails = schedules.find(s => s.id === selectedScheduleId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col min-h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-gray-900">Lumin<span className="text-blue-600">.ai</span></h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 bg-blue-50 text-blue-700 font-bold rounded-xl">Interviews & Results</a>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={() => navigate('/')} className="text-sm font-bold text-red-600 hover:underline">Log Out</button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 font-medium text-sm">Manage schedules and view AI analysis.</p>
          </div>
          <button onClick={() => setShowScheduleModal(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-indigo-700 text-sm w-full md:w-auto transition-all">
            + Schedule New Interview
          </button>
        </header>

        {/* Schedule Modal Overlay */}
        {showScheduleModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
              <h2 className="text-xl font-bold mb-4">Schedule Interview Cohort</h2>
              <div className="space-y-4 mb-6 text-sm font-medium">
                <div>
                  <label className="block mb-1 text-gray-700">Select Trade</label>
                  <select value={formData.trade} onChange={(e) => setFormData({...formData, trade: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option>Plumber</option>
                    <option>Electrician</option>
                    <option>Fitter</option>
                    <option>Tailor</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-gray-700">Date</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block mb-1 text-gray-700">Start Time</label>
                    <input type="time" value={formData.start} onChange={(e) => setFormData({...formData, start: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1 text-gray-700">End Time</label>
                    <input type="time" value={formData.end} onChange={(e) => setFormData({...formData, end: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowScheduleModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={handleCreateSchedule} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors">Create Schedule</button>
              </div>
            </div>
          </div>
        )}

        {/* Active Schedules Cards */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Select a Schedule to View Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((schedule) => (
              <div 
                key={schedule.id} 
                onClick={() => setSelectedScheduleId(schedule.id)}
                className={`cursor-pointer p-5 rounded-2xl shadow-sm border transition-all duration-200 ${
                  selectedScheduleId === schedule.id 
                  ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/30' 
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900 text-lg">{schedule.trade}</h3>
                  {selectedScheduleId === schedule.id && (
                    <span className="bg-blue-600 w-2 h-2 rounded-full"></span>
                  )}
                </div>
                <div className="space-y-1 text-sm text-gray-600 font-medium">
                  <p>📅 {schedule.date}</p>
                  <p>🕒 {schedule.start} to {schedule.end}</p>
                  <p className="mt-2 text-indigo-600 font-bold bg-indigo-50 inline-block px-2 py-1 rounded">
                    {candidateResults[schedule.id]?.length || 0} Candidates Assessed
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scoped Results Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800">
                Results: {selectedScheduleDetails?.trade} Assessment
              </h3>
              <p className="text-xs text-gray-500 mt-1">Date: {selectedScheduleDetails?.date}</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {activeCandidates.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Candidate Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">AI Score</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Fitment Status</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {activeCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{c.name}</td>
                      <td className="px-6 py-4 font-black text-gray-700">{c.score}%</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${c.badge}`}>{c.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-indigo-600 font-bold text-sm hover:underline">View Video</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">
                <div className="text-4xl mb-3">📭</div>
                <h3 className="font-bold text-gray-700">No candidates yet</h3>
                <p className="text-sm mt-1">Candidates who take this interview will appear here.</p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}