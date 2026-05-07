import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import { getAuth } from '../../lib/auth';
import LanguageToggle from '../../components/LanguageToggle';

export default function CandidateOnboarding() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    district: '',
    city: '',
    language: '',
    primary_skill: '',
    skills: '',
    category: ''
  });
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!auth?.token) {
      navigate('/');
      return;
    }
    if (auth?.role !== 'candidate') {
      navigate(auth?.role === 'admin' ? '/admin' : '/');
      return;
    }

    const loadProfile = async () => {
      try {
        const data = await apiJson('/api/candidate/me', { token: auth.token });
        setUsername(data.user?.username || '');
        setFormData({
          district: data.profile?.district || '',
          city: data.profile?.city || '',
          language: data.profile?.language || '',
          primary_skill: data.profile?.primary_skill || '',
          skills: (data.profile?.skills || []).join(', '),
          category: data.profile?.category || ''
        });
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [auth?.token, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const payload = {
        district: formData.district,
        city: formData.city,
        language: formData.language,
        primary_skill: formData.primary_skill,
        skills: formData.skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        category: formData.category
      };

      await apiJson('/api/candidate/profile', {
        method: 'PUT',
        token: auth.token,
        body: payload
      });

      navigate('/candidate');
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm font-semibold text-gray-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <div className="absolute top-6 right-6 z-50">
        <LanguageToggle />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Candidate setup</p>
          <h1 className="text-3xl md:text-4xl font-semibold mt-3">Complete your profile</h1>
          <p className="text-sm text-slate-300 mt-3 max-w-xl">
            Your district and city are required to join interviews. Fill in the rest to help interviewers filter
            and shortlist you quickly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-300">What should we call you</label>
            <input
              value={username}
              readOnly
              className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-300">District</label>
              <input
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-300">City</label>
              <input
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-300">Primary skill</label>
              <input
                value={formData.primary_skill}
                onChange={(e) => setFormData({ ...formData, primary_skill: e.target.value })}
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-300">Languages spoken</label>
              <input
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-300">Skills (comma separated)</label>
            <input
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-slate-300">Category (optional)</label>
            <input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
            />
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <button
            type="submit"
            className="w-full bg-emerald-400 text-slate-950 font-semibold py-3 rounded-xl hover:bg-emerald-300 transition"
          >
            Save and continue
          </button>
        </form>
      </div>
    </div>
  );
}
