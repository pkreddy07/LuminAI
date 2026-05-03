import React from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-gray-100">
        <h2 className="text-2xl font-black text-gray-900 mb-2">Create Account</h2>
        <p className="text-gray-500 text-sm mb-6">Join the platform to access interviews.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
            <input type="text" placeholder="Ramesh Kumar" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Primary Skill / Trade</label>
            <select className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option>Plumber</option>
              <option>Electrician</option>
              <option>Fitter</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Upload Resume (For AI Questions)</label>
            <input type="file" className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
        </div>

        <button onClick={() => navigate('/home')} className="w-full mt-8 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-md">
          Complete Registration
        </button>
        
        <p className="text-center text-sm text-gray-500 mt-6 font-medium">
          Already have an account? <Link to="/" className="text-blue-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}