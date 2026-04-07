import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { getUsers } from '../services/api';
import type { User, SessionStats } from '../types';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (user?.role === 'admin') {
      getUsers().then(setUsers).catch(console.error);
    }
    // For now, we'll show stats from localStorage or just show placeholder
    const storedStats = localStorage.getItem('mathbuddy_stats');
    if (storedStats) {
      setSessions(JSON.parse(storedStats));
    }
    setLoading(false);
  }, [user]);

  const totalProblems = sessions.reduce((acc, s) => acc + s.total_problems, 0);
  const totalCorrect = sessions.reduce((acc, s) => acc + s.correct_count, 0);
  const overallAccuracy = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="page-title">🎉 Welcome, {user?.username}!</h1>
          <p className="welcome-subtitle">Ready to practice some math today?</p>
        </div>
        <button className="btn btn-logout" onClick={handleLogout}>
          Logout 👋
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-value">{totalProblems}</div>
          <div className="stat-label">Problems Solved</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{totalCorrect}</div>
          <div className="stat-label">Correct Answers</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{overallAccuracy}%</div>
          <div className="stat-label">Accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">Sessions Completed</div>
        </div>
      </div>

      <div className="action-cards">
        <div className="action-card action-card-practice" onClick={() => navigate('/practice')}>
          <div className="action-icon">🧮</div>
          <h2>Start Practice!</h2>
          <p>Challenge yourself with fun math problems</p>
          <span className="action-btn">Let's Go! →</span>
        </div>

        {user?.role === 'admin' && (
          <div className="action-card action-card-admin" onClick={() => navigate('/admin')}>
            <div className="action-icon">⚙️</div>
            <h2>Admin Panel</h2>
            <p>Manage users and problems ({users.length} users)</p>
            <span className="action-btn">Manage →</span>
          </div>
        )}
      </div>

      <div className="mascot-section">
        <div className="mascot">🦊</div>
        <div className="mascot-speech">
          {totalProblems === 0
            ? "Wow, you haven't practiced yet! Click 'Start Practice' to begin your math adventure!"
            : overallAccuracy >= 80
            ? "Amazing work! You're a math superstar! ⭐"
            : overallAccuracy >= 50
            ? "Great job! Keep practicing and you'll get even better! 💪"
            : "Every practice makes you stronger! Keep going! 🌟"}
        </div>
      </div>
    </div>
  );
}
