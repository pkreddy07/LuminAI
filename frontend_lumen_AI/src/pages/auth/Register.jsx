import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import LanguageToggle from '../../components/LanguageToggle';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      // Calls the /api/auth/register endpoint in your FastAPI backend
      const response = await apiJson('/api/auth/register', {
        method: 'POST',
        body: {
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: 'candidate' // Hardcoded to candidate for this page
        }
      });

      // Registration successful! 
      setSuccess(true);
      setTimeout(() => {
        navigate('/'); // Redirect to login page after 2 seconds
      }, 2000);

    } catch (err) {
      setError(err.message || 'Registration failed. Email might already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">

      {/* ADD THE TOGGLE HERE! */}
      <div className="absolute top-6 right-6 z-50">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
        
        {/* Left Side: Branding / Info */}
        <div className="rounded-[32px] p-8 md:p-12 bg-gradient-to-br from-emerald-400/20 via-slate-900 to-slate-950 border border-emerald-300/20 shadow-[0_30px_120px_rgba(16,185,129,0.2)] flex flex-col justify-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Lumin.ai Candidates</p>
          <h1 className="text-3xl md:text-5xl font-semibold mt-4 leading-tight">
            Join the future of skills-based hiring.
          </h1>
          <p className="text-sm text-slate-300 mt-6 max-w-md">
            Create an account to access AI-powered assessments, upload your resume, and connect with top organizations instantly.
          </p>
          <div className="mt-10 grid gap-4 text-sm">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="font-semibold text-emerald-300">Zero Friction</p>
              <p className="text-slate-300 mt-1">Take video interviews securely from your mobile device.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Create Account</p>
              <h2 className="text-2xl font-semibold mt-2">Sign up as a Candidate</h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center font-bold">
              L
            </div>
          </div>

          {success ? (
            <div className="mt-8 bg-emerald-400/10 border border-emerald-400/30 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-emerald-300 font-bold text-lg">Registration Successful!</h3>
              <p className="text-slate-400 text-sm mt-2">Redirecting you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="mt-8 space-y-4">
              
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-300">Full Name</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Ramesh Kumar"
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-slate-300">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ramesh@example.com"
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-300">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-slate-300">Confirm</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400/50 transition-colors"
                  />
                </div>
              </div>

              {error && <p className="mt-2 text-sm text-rose-400 font-medium">{error}</p>}

              <div className="mt-8 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl hover:bg-emerald-300 transition-colors disabled:opacity-60 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>

              <p className="text-center text-sm text-slate-400 mt-6">
                Already have an account?{' '}
                <Link to="/" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                  Sign in here
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}