import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, deleteUser, getProblems, createProblem, deleteProblem, Problem as ProblemType, ProblemInput } from '../services/api';
import { useAuth } from '../store/authContext';
import UserList from '../components/admin/UserList';
import ProblemForm from '../components/admin/ProblemForm';
import type { User } from '../types';

type Tab = 'users' | 'problems';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [problems, setProblems] = useState<ProblemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, problemsData] = await Promise.all([getUsers(), getProblems()]);
      setUsers(usersData);
      setProblems(problemsData);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSuccess('User deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateProblem = async (data: ProblemInput) => {
    try {
      const newProblem = await createProblem(data);
      setProblems((prev) => [...prev, newProblem]);
      setSuccess('Problem created successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create problem');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteProblem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;
    try {
      await deleteProblem(id);
      setProblems((prev) => prev.filter((p) => p.id !== id));
      setSuccess('Problem deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete problem');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (loading) return <div className="loading">Loading admin panel...</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1 className="page-title">⚙️ Admin Panel</h1>
          <p className="admin-subtitle">Manage your MathBuddy settings</p>
        </div>
        <div className="admin-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <button className="btn btn-logout" onClick={handleLogout}>
            Logout 👋
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users ({users.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
          onClick={() => setActiveTab('problems')}
        >
          📝 Problems ({problems.length})
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="admin-section">
          <h2 className="admin-section-title">👥 User Management</h2>
          <p className="admin-section-desc">View and manage registered users</p>
          <UserList users={users} onDelete={handleDeleteUser} />
        </div>
      )}

      {activeTab === 'problems' && (
        <div className="admin-section">
          <h2 className="admin-section-title">📝 Problem Management</h2>
          <p className="admin-section-desc">Create and manage math problems</p>
          <ProblemForm onSave={handleCreateProblem} />
          <div className="problem-list">
            <h3>Existing Problems</h3>
            {problems.length === 0 ? (
              <p className="empty-message">No problems yet. Create one above!</p>
            ) : (
              (problems as ProblemType[]).map((problem) => (
                <div key={problem.id} className="problem-item">
                  <div className="problem-info">
                    <span className="problem-question">{problem.question}</span>
                    <span className="problem-meta">
                      {problem.operation_type} • {problem.difficulty}
                    </span>
                  </div>
                  <button
                    className="btn btn-danger-sm"
                    onClick={() => handleDeleteProblem(problem.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
