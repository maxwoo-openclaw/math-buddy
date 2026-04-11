import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { useLocale } from '../store/localeContext';

export default function Auth() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, user } = useAuth();
  const { t } = useLocale();
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
      setError(err instanceof Error ? err.message : t.loginErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-icon">🎯</div>
      <h1 className="auth-title">{isRegister ? t.joinMathbuddy : t.welcomeBack}</h1>
      <p className="auth-subtitle">
        {isRegister ? t.registerSubtitle : t.loginSubtitle}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{t.username}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t.enterUsername}
            required
          />
        </div>

        {isRegister && (
          <div className="form-group">
            <label>{t.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.enterEmail}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>{t.password}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.enterPassword}
            required
          />
        </div>

        {isRegister && (
          <div className="form-group">
            <label>{t.iAmA}</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${role === 'student' ? 'active' : ''}`}
                onClick={() => setRole('student')}
              >
                👧 {t.student}
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'parent' ? 'active' : ''}`}
                onClick={() => setRole('parent')}
              >
                👨‍👩‍👧 {t.parent}
              </button>
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t.pleaseWait : isRegister ? t.createAccount : `${t.login} 🎮`}
        </button>
      </form>

      <div className="auth-switch">
        {isRegister ? (
          <>
            {t.hasAccount}
            <a href="#" onClick={() => setIsRegister(false)}>{t.loginLink}</a>
          </>
        ) : (
          <>
            {t.noAccount}
            <a href="#" onClick={() => setIsRegister(true)}>{t.registerLink}</a>
          </>
        )}
      </div>
    </div>
  );
}
