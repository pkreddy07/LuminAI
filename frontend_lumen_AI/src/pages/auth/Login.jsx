import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import { setAuth } from '../../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('candidate');
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [email, setEmail] = useState('');
  
  // States for Password flow
  const [password, setPassword] = useState('');
  
  // States for OTP flow
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('contact'); // 'contact' -> 'otp'
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Reset errors and fields when switching methods
  const switchMethod = (method) => {
    setLoginMethod(method);
    setError('');
    setInfo('');
    setStep('contact');
    setOtp('');
    setPassword('');
  };

  const handleAuthSuccess = (response) => {
    setAuth({
      token: response.access_token,
      role: response.role,
      username: response.username,
      user_id: response.user_id
    });

    if (response.role === 'admin') {
      navigate('/admin');
    } else if (!response.profile_complete) {
      navigate('/candidate/onboarding');
    } else {
      navigate('/candidate');
    }
  };

  // --- PASSWORD LOGIN ---
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      const response = await apiJson('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password, role }
      });
      handleAuthSuccess(response);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // --- OTP FLOW: SEND ---
  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }

    try {
      setLoading(true);
      await apiJson('/api/auth/request-otp', {
        method: 'POST',
        body: { email: email.trim(), role }
      });

      setStep('otp');
      setInfo('OTP sent successfully. Please check your email.');
    } catch (err) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // --- OTP FLOW: VERIFY ---
  const verifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!otp.trim()) {
      setError('Enter the OTP sent to your email.');
      return;
    }

    try {
      setLoading(true);
      const response = await apiJson('/api/auth/verify-otp', {
        method: 'POST',
        body: { email: email.trim(), role, otp: otp.trim() }
      });
      handleAuthSuccess(response);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
        
        {/* Left Side: Branding */}
        <div className="rounded-[32px] p-8 md:p-12 bg-gradient-to-br from-emerald-400/20 via-slate-900 to-slate-950 border border-emerald-300/20 shadow-[0_30px_120px_rgba(16,185,129,0.2)] flex flex-col justify-center">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Lumin.ai Platform</p>
          <h1 className="text-3xl md:text-5xl font-semibold mt-4 leading-tight">
            Skill-based hiring, powered by AI co-pilots.
          </h1>
          <p className="text-sm text-slate-300 mt-6 max-w-md">
            Sign in to access interview windows, take AI-guided assessments, or manage your organization's talent pipeline.
          </p>
          <div className="mt-10 grid gap-4 text-sm">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 border-l-2 border-l-emerald-400">
              <p className="font-semibold text-white">Dynamic AI Scoring</p>
              <p className="text-slate-300 mt-1">Get evaluated on confidence, communication, and job readiness instantly.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Secure Login</p>
              <h2 className="text-2xl font-semibold mt-2">Access your dashboard</h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center font-bold">
              L
            </div>
          </div>

          <div className="mt-8">
            {/* Role Selector */}
            <div className="grid grid-cols-2 bg-black/30 rounded-full p-1 text-sm mb-6">
              <button
                onClick={() => setRole('candidate')}
                className={`rounded-full py-2 font-semibold transition ${role === 'candidate' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              >
                Candidate
              </button>
              <button
                onClick={() => setRole('admin')}
                className={`rounded-full py-2 font-semibold transition ${role === 'admin' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
              >
                Admin
              </button>
            </div>

            {/* Login Method Selector */}
            <div className="flex border-b border-white/10 mb-6">
              <button
                onClick={() => switchMethod('password')}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${loginMethod === 'password' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Use Password
              </button>
              <button
                onClick={() => switchMethod('otp')}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${loginMethod === 'otp' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Use Email OTP
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Shared Email Field */}
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loginMethod === 'otp' && step === 'otp'}
                placeholder="you@company.com"
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400/50 disabled:opacity-50 transition-colors"
              />
            </div>

            {/* Dynamic Fields based on Login Method */}
            {loginMethod === 'password' && (
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400/50 transition-colors"
                />
              </div>
            )}

            {loginMethod === 'otp' && step === 'otp' && (
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-300">Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-400/50 transition-colors"
                />
              </div>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-rose-400 font-medium">{error}</p>}
          {info && <p className="mt-4 text-xs text-emerald-400 font-medium">{info}</p>}

          <div className="mt-6">
            {loginMethod === 'password' ? (
              <button
                onClick={handlePasswordLogin}
                disabled={loading}
                className="w-full bg-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl hover:bg-emerald-300 transition disabled:opacity-60 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            ) : (
              // OTP Actions
              step === 'contact' ? (
                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full bg-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl hover:bg-emerald-300 transition disabled:opacity-60 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={verifyOtp}
                    disabled={loading}
                    className="w-full bg-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl hover:bg-emerald-300 transition disabled:opacity-60 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    {loading ? 'Verifying...' : 'Verify and Sign In'}
                  </button>
                  <button
                    onClick={() => { setStep('contact'); setOtp(''); }}
                    className="w-full text-sm text-slate-400 hover:text-slate-200 py-2"
                  >
                    Change Email Address
                  </button>
                </div>
              )
            )}
          </div>

          {/* SIGN UP LINK */}
          <div className="mt-8 text-center border-t border-white/10 pt-6">
            <p className="text-sm text-slate-400">
              New to the platform?{' '}
              <Link to="/register" className="text-emerald-400 font-bold hover:text-emerald-300 hover:underline">
                Create a Candidate Account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}