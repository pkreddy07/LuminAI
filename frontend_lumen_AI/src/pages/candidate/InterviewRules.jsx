import { useNavigate, useParams } from 'react-router-dom';

export default function InterviewRules() {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
      <div className="bg-white/5 max-w-lg w-full p-6 md:p-8 rounded-3xl border border-white/10">
        <h2 className="text-2xl font-semibold mb-4">Interview instructions</h2>

        <div className="bg-emerald-400/10 border border-emerald-300/20 rounded-xl p-4 mb-6">
          <p className="text-sm text-emerald-200 font-medium">
            This interview uses AI questions plus resume-based prompts.
          </p>
        </div>

        <ul className="space-y-4 mb-8 text-sm text-slate-200">
          <li>Make sure your room is quiet and well lit.</li>
          <li>Answer clearly. You can respond in Kannada or English.</li>
          <li>When you click next, you cannot go back.</li>
        </ul>

        <div className="flex flex-col gap-3">
          <button onClick={() => navigate(`/interview/${id}`)} className="w-full bg-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl hover:bg-emerald-300">
            Start camera
          </button>
          <button onClick={() => navigate('/candidate')} className="w-full text-slate-300 font-semibold py-2 hover:text-white">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}