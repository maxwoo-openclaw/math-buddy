import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';

export default function Auth() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(username, email, password, role);
      } else {
        await login(username, password);
      }
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-icon">🎯</div>
      <h1 className="auth-title">{isRegister ? 'Join MathBuddy! 🎉' : 'Welcome Back! 👋'}</h1>
      <p className="auth-subtitle">
        {isRegister ? 'Create your account and start learning!' : 'Ready to practice math?'}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
          />
        </div>

        {isRegister && (
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        {isRegister && (
          <div className="form-group">
            <label>I am a...</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${role === 'student' ? 'active' : ''}`}
                onClick={() => setRole('student')}
              >
                👧 Student
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'admin' ? 'active' : ''}`}
                onClick={() => setRole('admin')}
              >
                👩‍🏫 Teacher
              </button>
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '⏳ Please wait...' : isRegister ? 'Create Account 🚀' : 'Login 🎮'}
        </button>
      </form>

      <div className="auth-switch">
        {isRegister ? (
          <>
            Already have an account?{' '}
            <a href="#" onClick={() => setIsRegister(false)}>Login here</a>
          </>
        ) : (
          <>
            New here?{' '}
            <a href="#" onClick={() => setIsRegister(true)}>Create an account</a>
          </>
        )}
      </div>
    </div>
  );
}
