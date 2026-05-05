import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../../lib/api';
import { clearAuth, getAuth } from '../../lib/auth';

const emptySchedule = {
  organization_name: '',
  title: '',
  job_description: '',
  skills: '',
  preferred_questions: '',
  ask_category: false,
  start_time: '',
  end_time: ''
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState({ ongoing: [], past: [] });
  const [selectedJob, setSelectedJob] = useState(null);
  const [stats, setStats] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [filters, setFilters] = useState({ district: '', skill: '', language: '', category: '', q: '' });
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState(emptySchedule);
  const [viewCandidate, setViewCandidate] = useState(null);

  useEffect(() => {
    if (!auth?.token) {
      navigate('/');
      return;
    }

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const data = await apiJson('/api/admin/dashboard', { token: auth.token });
        setDashboard(data);
        if (!selectedJob && data.past?.length) {
          setSelectedJob(data.past[0]);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [auth?.token, navigate, selectedJob]);

  useEffect(() => {
    if (!selectedJob) return;

    const loadStats = async () => {
      try {
        const data = await apiJson(`/api/admin/jobs/${selectedJob._id}/stats`, { token: auth.token });
        setStats(data);
      } catch {
        setStats(null);
      }
    };

    loadStats();
  }, [auth?.token, selectedJob]);

  useEffect(() => {
    if (!selectedJob) return;

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
        const query = params.toString() ? `?${params.toString()}` : '';
        const data = await apiJson(`/api/admin/jobs/${selectedJob._id}/candidates${query}`, { token: auth.token });
        setCandidates(data || []);
      } catch {
        setCandidates([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [auth?.token, selectedJob, filters]);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const handleSchedule = async () => {
    setError('');
    if (!scheduleData.organization_name || !scheduleData.title || !scheduleData.start_time || !scheduleData.end_time) {
      setError('Organization, title, and time window are required.');
      return;
    }

    try {
      const payload = {
        organization_name: scheduleData.organization_name,
        title: scheduleData.title,
        job_description: scheduleData.job_description,
        skills: scheduleData.skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        preferred_questions: scheduleData.preferred_questions
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        ask_category: scheduleData.ask_category,
        start_time: scheduleData.start_time,
        end_time: scheduleData.end_time
      };

      await apiJson('/api/admin/jobs', {
        method: 'POST',
        token: auth.token,
        body: payload
      });

      setScheduleData(emptySchedule);
      setShowScheduleModal(false);
      const data = await apiJson('/api/admin/dashboard', { token: auth.token });
      setDashboard(data);
    } catch (err) {
      setError(err.message || 'Failed to schedule interview');
    }
  };

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex flex-col lg:flex-row">
        <aside className="lg:w-72 bg-black/40 border-r border-white/5 p-6 min-h-screen">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Admin</p>
              <h1 className="text-lg font-semibold">Lumin.ai</h1>
            </div>
          </div>
          <div className="mt-10 space-y-2">
            <button className="w-full text-left bg-emerald-400/10 text-emerald-200 px-4 py-3 rounded-xl font-semibold">
              Interview dashboard
            </button>
            <button onClick={handleLogout} className="w-full text-left text-slate-400 hover:text-slate-200 px-4 py-3 rounded-xl">
              Log out
            </button>
          </div>
        </aside>

        <main className="flex-1 px-6 py-10 space-y-10">
          <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Interview control room</h2>
              <p className="text-sm text-slate-300 mt-2">Track live interview windows and post new calls.</p>
            </div>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 rounded-full hover:bg-emerald-300 transition"
            >
              + Schedule interview
            </button>
          </header>

          {error && <p className="text-sm text-rose-300">{error}</p>}

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Ongoing interviews</h3>
              <span className="text-xs text-slate-400">Live attendance</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {dashboard.ongoing?.length === 0 && !loading && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-slate-300">
                  No live interviews right now.
                </div>
              )}
              {dashboard.ongoing?.map((job) => (
                <div key={job._id} className="bg-white/5 border border-emerald-300/10 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">{job.organization_name}</p>
                  <h4 className="text-lg font-semibold mt-1">{job.title}</h4>
                  <p className="text-sm text-slate-300 mt-2">
                    Window: {new Date(job.start_time).toLocaleString()} - {new Date(job.end_time).toLocaleTimeString()}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs bg-emerald-400/20 text-emerald-200 px-3 py-1 rounded-full">
                      {job.current_attendees} attending now
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Past interviews</h3>
              <span className="text-xs text-slate-400">Click to view stats</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {dashboard.past?.length === 0 && !loading && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-slate-300">
                  No completed interviews yet.
                </div>
              )}
              {dashboard.past?.map((job) => (
                <button
                  key={job._id}
                  onClick={() => setSelectedJob(job)}
                  className={`text-left rounded-2xl p-5 border transition ${
                    selectedJob?._id === job._id
                      ? 'border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_15px_rgba(52,211,153,0.1)]'
                      : 'border-white/10 bg-white/5 hover:border-emerald-300/40'
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{job.organization_name}</p>
                  <h4 className="text-lg font-semibold mt-1">{job.title}</h4>
                  <p className="text-sm text-slate-300 mt-2">Attended: {job.total_attended}</p>
                </button>
              ))}
            </div>
          </section>

          {selectedJob && (
            <section className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">{selectedJob.title} insights</h3>
                  <p className="text-sm text-slate-300 mt-2">Performance stats and candidate list.</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="bg-emerald-400/20 text-emerald-200 px-3 py-1 rounded-full">
                    Job ready: {stats?.job_ready_pct || 0}%
                  </span>
                  <span className="bg-amber-400/20 text-amber-200 px-3 py-1 rounded-full">
                    Needs training: {stats?.needs_training_pct || 0}%
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs uppercase text-slate-400">Confidence</p>
                  <p className="text-2xl font-semibold mt-2">{stats?.avg_confidence || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs uppercase text-slate-400">Communication</p>
                  <p className="text-2xl font-semibold mt-2">{stats?.avg_communication || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs uppercase text-slate-400">Body language</p>
                  <p className="text-2xl font-semibold mt-2">{stats?.avg_body_language || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs uppercase text-slate-400">Overall</p>
                  <p className="text-2xl font-semibold mt-2">{stats?.avg_overall || 0}</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold">Candidate list</h4>
                    <p className="text-sm text-slate-300">Filter candidates and review scores.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <input
                      value={filters.q}
                      onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                      placeholder="Search name or email"
                      className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={filters.district}
                      onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                      placeholder="District"
                      className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={filters.skill}
                      onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
                      placeholder="Skill"
                      className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={filters.language}
                      onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                      placeholder="Language"
                      className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                    />
                    <input
                      value={filters.category}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                      placeholder="Category"
                      className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                {candidates.length === 0 ? (
                  <p className="text-sm text-slate-400">No candidates match the current filters.</p>
                ) : (
                  <div className="grid gap-4">
                    {candidates.map((candidate) => (
                      <div key={candidate.candidate_id} className="bg-black/40 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold">{candidate.username || 'Candidate'}</p>
                            <p className="text-xs text-slate-400">{candidate.email || candidate.phone_number}</p>
                            <p className="text-xs text-slate-400">{candidate.district || 'Unknown district'} · {candidate.city || 'Unknown city'}</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="bg-white/10 px-3 py-1 rounded-full">Overall: {candidate.overall_score ?? 'NA'}</span>
                            <span className="bg-emerald-400/20 text-emerald-200 px-3 py-1 rounded-full">
                              {candidate.recommendation || 'Pending'}
                            </span>
                            <button
                              onClick={() => setViewCandidate(candidate)}
                              className="bg-emerald-400 text-slate-950 px-4 py-1.5 rounded-full font-semibold hover:bg-emerald-300 transition"
                            >
                              View Info
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4 z-40">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Schedule interview window</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                value={scheduleData.organization_name}
                onChange={(e) => setScheduleData({ ...scheduleData, organization_name: e.target.value })}
                placeholder="Organization name"
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                value={scheduleData.title}
                onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                placeholder="Role title"
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <textarea
              value={scheduleData.job_description}
              onChange={(e) => setScheduleData({ ...scheduleData, job_description: e.target.value })}
              placeholder="Job description"
              rows={3}
              className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white w-full"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <input
                value={scheduleData.skills}
                onChange={(e) => setScheduleData({ ...scheduleData, skills: e.target.value })}
                placeholder="Skills (comma separated)"
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                value={scheduleData.preferred_questions}
                onChange={(e) => setScheduleData({ ...scheduleData, preferred_questions: e.target.value })}
                placeholder="Questions (one per line)"
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="datetime-local"
                value={scheduleData.start_time}
                onChange={(e) => setScheduleData({ ...scheduleData, start_time: e.target.value })}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
              <input
                type="datetime-local"
                value={scheduleData.end_time}
                onChange={(e) => setScheduleData({ ...scheduleData, end_time: e.target.value })}
                className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={scheduleData.ask_category}
                onChange={(e) => setScheduleData({ ...scheduleData, ask_category: e.target.checked })}
              />
              Ask category preference during onboarding
            </label>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="bg-white/10 text-white px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                className="bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl font-semibold"
              >
                Create window
              </button>
            </div>
          </div>
        </div>
      )}

      {viewCandidate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-black/50 border border-white/10 rounded-2xl overflow-hidden shrink-0">
                  {viewCandidate.initial_snapshot_url ? (
                    <img
                      src={`${apiBase}${viewCandidate.initial_snapshot_url}`}
                      alt="Candidate snapshot"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No image</div>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-white">{viewCandidate.username || 'Candidate'}</h3>
                  <p className="text-slate-400 text-sm mt-1">{viewCandidate.email || viewCandidate.phone_number}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-emerald-400/20 text-emerald-200 px-3 py-1 rounded-full border border-emerald-400/20">
                      {viewCandidate.recommendation || 'Pending'}
                    </span>
                    {viewCandidate.integrity_match === false && (
                      <span className="text-xs bg-rose-400/20 text-rose-200 px-3 py-1 rounded-full border border-rose-400/20">
                        Face Mismatch Flag
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewCandidate(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 hover:text-white transition"
              >
                &times;
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Location</p>
                  <p className="font-medium text-slate-200 mt-1">{viewCandidate.district || 'NA'} · {viewCandidate.city || 'NA'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Language</p>
                  <p className="font-medium text-slate-200 mt-1">{viewCandidate.language || 'NA'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Category</p>
                  <p className="font-medium text-slate-200 mt-1">{viewCandidate.category || 'NA'}</p>
                </div>
                {viewCandidate.resume_url && (
                  <div>
                    <a href={`${apiBase}${viewCandidate.resume_url}`} target="_blank" rel="noreferrer" className="text-emerald-400 font-semibold hover:text-emerald-300 underline">
                      View Resume
                    </a>
                  </div>
                )}
              </div>
              
              <div className="space-y-4 text-sm bg-black/40 border border-white/5 rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Performance Scores</p>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-slate-300">Confidence</span>
                  <span className="font-semibold text-white">{viewCandidate.confidence_score ?? 'NA'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-slate-300">Communication</span>
                  <span className="font-semibold text-white">{viewCandidate.communication_score ?? 'NA'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-slate-300">Body Language</span>
                  <span className="font-semibold text-white">{viewCandidate.body_language_score ?? 'NA'}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-300 font-semibold">Overall</span>
                  <span className="text-lg font-bold text-emerald-400">{viewCandidate.overall_score ?? 'NA'}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <button
                onClick={() => setViewCandidate(null)}
                className="bg-white/10 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-white/20 transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
