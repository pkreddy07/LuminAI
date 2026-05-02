import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CandidateInterview from './pages/CandidateInterview';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CandidateInterview />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;