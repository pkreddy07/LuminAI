import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import CandidateHome from './pages/candidate/CandidateHome';
import CandidateOnboarding from './pages/candidate/CandidateOnboarding';
import InterviewRules from './pages/candidate/InterviewRules';
import ActiveInterview from './pages/candidate/ActiveInterview';
import AdminDashboard from './pages/admin/AdminDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/candidate" element={<CandidateHome />} />
        <Route path="/candidate/onboarding" element={<CandidateOnboarding />} />
        <Route path="/rules/:id" element={<InterviewRules />} />
        <Route path="/interview/:id" element={<ActiveInterview />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;