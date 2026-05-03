import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-xl">L</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Lumin<span className="text-blue-600">.ai</span></h1>
          <p className="text-gray-500 text-sm mt-1">Workforce Fitment Platform</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
            <input type="email" defaultValue="demo@candidate.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input type="password" defaultValue="********" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <button onClick={() => navigate('/home')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md">
            Login as Candidate
          </button>
          <button onClick={() => navigate('/admin')} className="w-full bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-100 transition-colors">
            Login as Admin
          </button>
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          New worker? <Link to="/register" className="text-blue-600 hover:underline">Register here</Link>
        </p>
      </div>
    </div>
  );
}