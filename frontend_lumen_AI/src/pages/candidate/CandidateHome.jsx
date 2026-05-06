import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import { clearAuth, getAuth } from '../../lib/auth';
import LanguageToggle from '../../components/LanguageToggle';

export default function CandidateHome() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [attendedJobs, setAttendedJobs] = useState([]);

  useEffect(() => {
    if (!auth?.token) {
      navigate('/');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        const query = search ? `?q=${encodeURIComponent(search)}` : '';

        const [meData, active, recent, attended] = await Promise.all([
          apiJson('/api/candidate/me', { token: auth.token }),
          apiJson(`/api/candidate/jobs/active${query}`, { token: auth.token }),
          apiJson(`/api/candidate/jobs/recent${query}`, { token: auth.token }),
          apiJson(`/api/candidate/jobs/attended${query}`, { token: auth.token })
        ]);

        setMe(meData);
        setActiveJobs(active || []);
        setRecentJobs(recent || []);
        setAttendedJobs(attended || []);
      } catch (err) {
        setError(err.message || 'Failed to load interviews');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [auth?.token, navigate, search]);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const formatWindow = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    return `${startTime.toLocaleString()} - ${endTime.toLocaleTimeString()}`;
  };

  const profileIncomplete = !me?.profile?.district || !me?.profile?.city;

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <div className="absolute top-6 right-6 z-50">
        <LanguageToggle />
      </div>

      <header className="bg-black/40 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Candidate hub</p>
          <h1 className="text-lg font-semibold">Welcome, {auth?.username || 'Candidate'}</h1>
        </div>
        <button onClick={handleLogout} className="text-xs bg-white/10 text-white px-4 py-2 rounded-full font-semibold hover:bg-white/20">
          Log out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">Available interviews</h2>
            <p className="text-sm text-slate-300 mt-2">Search active, recent, and attended interviews.</p>
          </div>
          <div className="w-full md:w-80">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, title, or skill"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
            />
          </div>
        </div>

        {profileIncomplete && (
          <div className="bg-amber-400/10 border border-amber-300/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="font-semibold">Complete your profile</p>
              <p className="text-sm text-amber-100">District and city are required before joining interviews.</p>
            </div>
            <button
              onClick={() => navigate('/candidate/onboarding')}
              className="bg-amber-300 text-slate-950 font-semibold px-4 py-2 rounded-full"
            >
              Update profile
            </button>
          </div>
        )}

        {loading && <p className="text-sm text-slate-400">Loading interviews...</p>}
        {error && <p className="text-sm text-rose-300">{error}</p>}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Active now</h3>
            <span className="text-xs text-slate-400">{activeJobs.length} live</span>
          </div>
          <div className="grid gap-4">
            {activeJobs.length === 0 && !loading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-slate-300">
                No active interviews right now.
              </div>
            )}
            {activeJobs.map((job) => (
              <div key={job._id} className="bg-white/5 border border-emerald-300/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{job.organization_name}</p>
                  <h4 className="text-lg font-semibold mt-1">{job.title}</h4>
                  <p className="text-sm text-slate-300 mt-2">Window: {formatWindow(job.start_time, job.end_time)}</p>
                  {job.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {job.skills.map((skill) => (
                        <span key={skill} className="text-xs bg-white/10 px-2 py-1 rounded-full">{skill}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/interview/${job._id}`)}
                  disabled={job.has_attended || profileIncomplete}
                  className="bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 rounded-full hover:bg-emerald-300 disabled:opacity-50"
                >
                  {profileIncomplete ? 'Complete profile first' : job.has_attended ? 'Already attended' : 'Start interview'}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Recently ended</h3>
            <span className="text-xs text-slate-400">Last 24 hours</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {recentJobs.length === 0 && !loading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-slate-300">
                No interviews ended in the last 24 hours.
              </div>
            )}
            {recentJobs.map((job) => (
              <div key={job._id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{job.organization_name}</p>
                <h4 className="text-lg font-semibold mt-1">{job.title}</h4>
                <p className="text-sm text-slate-300 mt-2">Ended: {new Date(job.end_time).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Attended interviews</h3>
            <span className="text-xs text-slate-400">Your history</span>
          </div>
          <div className="grid gap-4">
            {attendedJobs.length === 0 && !loading && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-slate-300">
                You have not attended any interviews yet.
              </div>
            )}
            {attendedJobs.map((job) => (
              <div key={job._id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{job.organization_name}</p>
                  <h4 className="text-lg font-semibold mt-1">{job.title}</h4>
                </div>
                <span className="text-xs bg-emerald-400/20 text-emerald-200 px-3 py-1 rounded-full">Attended</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
