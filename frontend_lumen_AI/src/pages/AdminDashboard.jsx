import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const mockCandidates = [
    { id: 1, name: 'Ramesh K.', trade: 'Plumber', date: 'Just now', score: 88, status: 'Deployment-Ready', badge: 'bg-green-100 text-green-800 border-green-200' },
    { id: 2, name: 'Suresh M.', trade: 'Electrician', date: '2 hrs ago', score: 65, status: 'Needs Upskilling', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { id: 3, name: 'Unknown User', trade: 'Fitter', date: '5 hrs ago', score: 25, status: 'Suspected Fraud', badge: 'bg-red-100 text-red-800 border-red-200' },
    { id: 4, name: 'Lakshmi N.', trade: 'Tailor', date: '1 day ago', score: 92, status: 'Deployment-Ready', badge: 'bg-green-100 text-green-800 border-green-200' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* MOBILE HEADER (Only visible on small screens) */}
      <header className="md:hidden w-full bg-white shadow-sm px-4 py-3 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black leading-none">L</span>
          </div>
          <h1 className="text-lg font-black tracking-tight text-gray-900">Lumin<span className="text-blue-600">.ai</span> Admin</h1>
        </div>
        <Link to="/" className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
          Exit
        </Link>
      </header>

      {/* SIDEBAR NAVIGATION (Hidden on mobile, visible on tablet/desktop) */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col min-h-screen sticky top-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-black leading-none">L</span>
          </div>
          <h1 className="text-xl font-black tracking-tight text-gray-900">Lumin<span className="text-blue-600">.ai</span></h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="#" className="flex items-center px-4 py-3 bg-blue-50 text-blue-700 font-bold rounded-xl">Workforce Fitment</a>
          <a href="#" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 font-medium rounded-xl transition-colors">Skill Datasets</a>
          <a href="#" className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 font-medium rounded-xl transition-colors">Fraud Audits</a>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <Link to="/" className="text-sm font-medium text-gray-500 hover:text-indigo-600 flex items-center">
            ← Back to Interview App
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 w-full max-w-[100vw]">
        
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Workforce Fitment</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1 font-medium">Karnataka EDCS Assessment Overview</p>
          </div>
          <button className="w-full md:w-auto bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-indigo-700 transition-colors text-sm">
            Export Report
          </button>
        </header>

        {/* KPI Cards (Stack on mobile, row on desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          {[
            { label: 'Total Assessed', value: '1,248', trend: '+12% this week', color: 'text-blue-600' },
            { label: 'Deployment Ready', value: '842', trend: 'High fitment rate', color: 'text-green-600' },
            { label: 'Fraud Flags', value: '41', trend: 'Requires manual audit', color: 'text-red-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <h3 className={`text-3xl md:text-4xl font-black mt-2 ${stat.color}`}>{stat.value}</h3>
              <p className="text-xs md:text-sm text-gray-500 mt-1 font-medium">{stat.trend}</p>
            </div>
          ))}
        </div>

        {/* Candidates Table Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Table Header & Search (Stacks on mobile) */}
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/50">
            <h3 className="font-bold text-gray-800 text-sm md:text-base">Recent Assessments</h3>
            <input 
              type="text" 
              placeholder="Search candidate..." 
              className="w-full sm:w-64 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          
          {/* SWIPEABLE TABLE WRAPPER FOR MOBILE */}
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Candidate</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Trade</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">AI Score</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Fitment Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.date}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-600">{c.trade}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-gray-900">{c.score}%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${c.badge}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                      <button className="text-indigo-600 hover:text-indigo-900 hover:underline">Review Video</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
      </main>
    </div>
  );
}