import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import { setAuth } from '../../lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState('candidate');
  const [channel, setChannel] = useState('email');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [step, setStep] = useState('contact');
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    if (nextRole === 'admin') setChannel('email');
  };

  const sendOtp = async () => {
    setError('');
    setInfo('');
    if (!contact.trim()) {
      setError('Enter your email or phone number.');
      return;
    }

    try {
      setLoading(true);
      const payload = channel === 'email' || role === 'admin'
        ? { email: contact.trim(), role }
        : { phone_number: contact.trim(), role };

      const response = await apiJson('/api/auth/request-otp', {
        method: 'POST',
        body: payload
      });

      const isNewUser = Boolean(response.is_new);
      setIsNew(isNewUser);
      if (response.dev_otp) {
        setOtp(response.dev_otp);
        setInfo(`Dev OTP: ${response.dev_otp}`);
        if (!isNewUser) {
          await verifyOtp(response.dev_otp);
          return;
        }
      }
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (overrideOtp) => {
    setError('');
    setInfo('');
    const otpValue = typeof overrideOtp === 'string' ? overrideOtp.trim() : otp.trim();
    if (!otpValue) {
      setError('Enter the OTP sent to you.');
      return;
    }
    if (isNew && !username.trim()) {
      setError('Tell us what we should call you.');
      return;
    }

    try {
      setLoading(true);
      const payload = channel === 'email' || role === 'admin'
        ? { email: contact.trim(), role, otp: otpValue, username: isNew ? username.trim() : undefined }
        : { phone_number: contact.trim(), role, otp: otpValue, username: isNew ? username.trim() : undefined };

      const response = await apiJson('/api/auth/verify-otp', {
        method: 'POST',
        body: payload
      });

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
    } catch (err) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
        <div className="rounded-[32px] p-8 md:p-12 bg-gradient-to-br from-emerald-400/20 via-slate-900 to-slate-950 border border-emerald-300/20 shadow-[0_30px_120px_rgba(16,185,129,0.2)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Lumin.ai marketplace</p>
          <h1 className="text-3xl md:text-5xl font-semibold mt-4 leading-tight">
            Open interview windows for high-volume hiring, powered by AI co-pilots.
          </h1>
          <p className="text-sm text-slate-300 mt-6 max-w-md">
            Post an interview window, let candidates join instantly, and review scored performance, confidence,
            communication, and body language metrics in one place.
          </p>
          <div className="mt-10 grid gap-4 text-sm">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="font-semibold">Live attendance</p>
              <p className="text-slate-300 mt-1">See who is joining interviews in real time.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="font-semibold">AI scoring</p>
              <p className="text-slate-300 mt-1">Compare confidence, communication, and job readiness.</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 md:p-10 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Sign in</p>
              <h2 className="text-2xl font-semibold mt-2">Continue to your dashboard</h2>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center font-bold">
              L
            </div>
          </div>

          <div className="mt-8">
            <div className="grid grid-cols-2 bg-black/30 rounded-full p-1 text-sm">
              <button
                onClick={() => handleRoleChange('candidate')}
                className={`rounded-full py-2 font-semibold transition ${role === 'candidate' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300'}`}
              >
                Candidate
              </button>
              <button
                onClick={() => handleRoleChange('admin')}
                className={`rounded-full py-2 font-semibold transition ${role === 'admin' ? 'bg-emerald-400 text-slate-950' : 'text-slate-300'}`}
              >
                Admin
              </button>
            </div>

            {role === 'candidate' && (
              <div className="mt-6 grid grid-cols-2 bg-black/30 rounded-full p-1 text-xs">
                <button
                  onClick={() => setChannel('email')}
                  className={`rounded-full py-2 font-semibold transition ${channel === 'email' ? 'bg-white text-slate-950' : 'text-slate-300'}`}
                >
                  Email
                </button>
                <button
                  onClick={() => setChannel('phone')}
                  className={`rounded-full py-2 font-semibold transition ${channel === 'phone' ? 'bg-white text-slate-950' : 'text-slate-300'}`}
                >
                  Phone
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-300">
                {role === 'admin' || channel === 'email' ? 'Email address' : 'Phone number'}
              </label>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={role === 'admin' || channel === 'email' ? 'you@company.com' : '98XXXXXXXX'}
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
            </div>

            {step === 'otp' && (
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-300">OTP</label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>
            )}

            {step === 'otp' && isNew && (
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-300">What would you like us to call you</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>
            )}
          </div>

          {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
          {info && <p className="mt-4 text-xs text-emerald-200">{info}</p>}

          <div className="mt-6">
            {step === 'contact' ? (
              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full bg-emerald-400 text-slate-950 font-semibold py-3 rounded-xl hover:bg-emerald-300 transition disabled:opacity-60"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => verifyOtp()}
                  disabled={loading}
                  className="w-full bg-emerald-400 text-slate-950 font-semibold py-3 rounded-xl hover:bg-emerald-300 transition disabled:opacity-60"
                >
                  {loading ? 'Verifying...' : 'Verify and continue'}
                </button>
                <button
                  onClick={() => setStep('contact')}
                  className="w-full text-sm text-slate-400 hover:text-slate-200"
                >
                  Use a different email or phone
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}