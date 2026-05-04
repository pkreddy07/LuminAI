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
  const [selectedCandidate, setSelectedCandidate] = useState(null);

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
  }, [auth?.token, navigate]);

  useEffect(() => {
    if (!selectedJob) return;

    const loadStats = async () => {
      try {
        const data = await apiJson(`/api/admin/jobs/${selectedJob._id}/stats`, { token: auth.token });
        setStats(data);
      } catch (err) {
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
      } catch (err) {
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
              className="bg-emerald-400 text-slate-950 font-semibold px-5 py-2.5 rounded-full hover:bg-emerald-300"
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
                      ? 'border-emerald-400/60 bg-emerald-400/10'
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

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="grid md:grid-cols-4 gap-3">
                  <input
                    placeholder="Search name"
                    value={filters.q}
                    onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="District"
                    value={filters.district}
                    onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Skill"
                    value={filters.skill}
                    onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Language"
                    value={filters.language}
                    onChange={(e) => setFilters({ ...filters, language: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                  <input
                    placeholder="Category"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />
                </div>

                <div className="divide-y divide-white/10">
                  {candidates.length === 0 && (
                    <div className="py-6 text-sm text-slate-300">No candidates match this filter.</div>
                  )}
                  {candidates.map((candidate) => (
                    <div key={candidate.candidate_id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-semibold">{candidate.name || 'Unnamed candidate'}</p>
                        <p className="text-xs text-slate-400">{candidate.primary_skill || 'Skill not set'} · {candidate.language || 'Language not set'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-white/10 px-3 py-1 rounded-full">Overall {candidate.overall_score || 0}</span>
                        <button
                          onClick={() => setSelectedCandidate(candidate)}
                          className="text-sm text-emerald-200 hover:text-emerald-100"
                        >
                          View info
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-slate-950 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Schedule an interview</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-white">Close</button>
            </div>
            <div className="mt-6 grid gap-4">
              <input
                placeholder="Organization name"
                value={scheduleData.organization_name}
                onChange={(e) => setScheduleData({ ...scheduleData, organization_name: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              />
              <input
                placeholder="Interview title"
                value={scheduleData.title}
                onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              />
              <textarea
                rows="4"
                placeholder="Job description"
                value={scheduleData.job_description}
                onChange={(e) => setScheduleData({ ...scheduleData, job_description: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              />
              <input
                placeholder="Skills (comma separated)"
                value={scheduleData.skills}
                onChange={(e) => setScheduleData({ ...scheduleData, skills: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              />
              <textarea
                rows="3"
                placeholder="Preferred questions (one per line)"
                value={scheduleData.preferred_questions}
                onChange={(e) => setScheduleData({ ...scheduleData, preferred_questions: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
              />
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs uppercase tracking-widest text-slate-400">Start time</label>
                  <input
                    type="datetime-local"
                    value={scheduleData.start_time}
                    onChange={(e) => setScheduleData({ ...scheduleData, start_time: e.target.value })}
                    className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs uppercase tracking-widest text-slate-400">End time</label>
                  <input
                    type="datetime-local"
                    value={scheduleData.end_time}
                    onChange={(e) => setScheduleData({ ...scheduleData, end_time: e.target.value })}
                    className="mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={scheduleData.ask_category}
                  onChange={(e) => setScheduleData({ ...scheduleData, ask_category: e.target.checked })}
                  className="h-4 w-4"
                />
                Ask candidates for category during interview
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 bg-white/10 text-white py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                className="flex-1 bg-emerald-400 text-slate-950 font-semibold py-3 rounded-xl"
              >
                Schedule now
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-slate-950 border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-3xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Candidate details</h3>
              <button onClick={() => setSelectedCandidate(null)} className="text-slate-400 hover:text-white">Close</button>
            </div>
            <div className="mt-6 grid md:grid-cols-[0.6fr_1fr] gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-center">
                {selectedCandidate.snapshot_url ? (
                  <img src={selectedCandidate.snapshot_url} alt="Candidate" className="rounded-xl object-cover w-full h-48" />
                ) : (
                  <div className="text-sm text-slate-400">No snapshot available</div>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <p><span className="text-slate-400">Name:</span> {selectedCandidate.name || 'Not provided'}</p>
                <p><span className="text-slate-400">Phone:</span> {selectedCandidate.phone_number || 'Not provided'}</p>
                <p><span className="text-slate-400">District:</span> {selectedCandidate.district || 'Not provided'}</p>
                <p><span className="text-slate-400">Language:</span> {selectedCandidate.language || 'Not provided'}</p>
                <p><span className="text-slate-400">Category:</span> {selectedCandidate.category || 'Not provided'}</p>
                <p><span className="text-slate-400">Resume:</span> {selectedCandidate.resume_url ? 'Submitted' : 'Not submitted'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Confidence</p>
                    <p className="text-lg font-semibold">{selectedCandidate.confidence_score || 0}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Communication</p>
                    <p className="text-lg font-semibold">{selectedCandidate.communication_score || 0}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Body language</p>
                    <p className="text-lg font-semibold">{selectedCandidate.body_language_score || 0}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-slate-400">Overall</p>
                    <p className="text-lg font-semibold">{selectedCandidate.overall_score || 0}</p>
                  </div>
                </div>
                <p><span className="text-slate-400">Recommendation:</span> {selectedCandidate.recommendation || 'Pending'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}