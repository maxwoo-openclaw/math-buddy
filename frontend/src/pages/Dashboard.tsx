import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { useTheme } from '../store/themeContext';
import { useLocale } from '../store/localeContext';
import { getUsers, getAchievements, getStreak, getDailyChallengeStatus, getUserSessions, startSession } from '../services/api';
import type { User, SessionStats } from '../types';
import type { Achievement, NewAchievement, StreakInfo, DailyChallengeStatus } from '../services/api';
import AchievementBadge from '../components/achievements/AchievementBadge';
import AchievementToast from '../components/achievements/AchievementToast';
import StreakCard from '../components/gamification/StreakCard';
import SkillTreeCard from '../components/gamification/SkillTreeCard';
import DailyChallengeCard from '../components/gamification/DailyChallengeCard';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useLocale();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [achievements, setAchievements] = useState<{achievements: Achievement[]; earned_count: number; total_count: number} | null>(null);
  const [newAchievement, setNewAchievement] = useState<NewAchievement | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeStatus | null>(null);
  const [challengeSessionId, setChallengeSessionId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      getUsers().then(setUsers).catch(console.error);
    }
    getUserSessions().then(setSessions).catch(console.error);
    setLoading(false);
    getAchievements().then(setAchievements).catch(console.error);
    getStreak().then(setStreak).catch(console.error);
    getDailyChallengeStatus().then(setDailyChallenge).catch(console.error);
  }, [user]);

  const totalProblems = sessions.reduce((acc, s) => acc + s.total_problems, 0);
  const totalCorrect = sessions.reduce((acc, s) => acc + s.correct_count, 0);
  const overallAccuracy = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0;

  const startDailyChallenge = async () => {
    try {
      const session = await startSession();
      setChallengeSessionId(session.session_id);
      navigate('/practice', { state: { sessionId: session.session_id, isDailyChallenge: true } });
    } catch (e) {
      console.error('Failed to start daily challenge', e);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const mascotMessage = totalProblems === 0
    ? t.mascotNoPractice
    : overallAccuracy >= 80
    ? t.mascotGreat
    : overallAccuracy >= 50
    ? t.mascotGood
    : t.mascotKeepGoing;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1 className="page-title">{t.welcome(user?.username || '')}</h1>
          <p className="welcome-subtitle">{t.readyToPractice}</p>
        </div>
        <button className="btn btn-logout" onClick={handleLogout}>
          {t.logout}
        </button>
        <button
          className="btn btn-secondary"
          onClick={toggleTheme}
          style={{ padding: '10px 14px', fontSize: '18px' }}
          title="Toggle dark mode"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setLocale(locale === 'en' ? 'zhTW' : 'en')}
          style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 700 }}
          title="Toggle language"
        >
          {locale === 'en' ? '中文' : 'EN'}
        </button>
      </div>

      <div className="stats-grid">
        <StreakCard streak={streak || { current_streak: 0, longest_streak: 0, last_practice_date: null, streak_dates: [] }} />
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-value">{totalProblems}</div>
          <div className="stat-label">{t.problemsSolved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{totalCorrect}</div>
          <div className="stat-label">{t.accuracy}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{overallAccuracy}%</div>
          <div className="stat-label">{t.accuracy}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{sessions.length}</div>
          <div className="stat-label">{t.sessionsCompleted || 'Sessions Completed'}</div>
        </div>
      </div>

      {dailyChallenge && (
        <div style={{ margin: '1rem 0' }}>
          <DailyChallengeCard status={dailyChallenge} onStart={startDailyChallenge} />
        </div>
      )}

      <div style={{ margin: '1rem 0' }}>
        <SkillTreeCard />
      </div>

      <div className="action-cards">
        <div className="action-card action-card-practice" onClick={() => navigate('/practice')}>
          <div className="action-icon">🧮</div>
          <h2>{t.startPractice}</h2>
          <p>{t.challengeYourself}</p>
          <span className="action-btn">{t.goButton}</span>
        </div>

        <div className="action-card" onClick={() => navigate('/speedrun')} style={{ cursor: 'pointer', background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)', color: 'white' }}>
          <div className="action-icon">⚡</div>
          <h2>{t.speedRun}</h2>
          <p>{t.speedRunDesc}</p>
          <span className="action-btn" style={{ color: 'white' }}>{t.startNow}</span>
        </div>

        <div className="action-card" onClick={() => navigate('/leaderboard')} style={{ cursor: 'pointer' }}>
          <div className="action-icon">🏆</div>
          <h2>{t.leaderboard}</h2>
          <p>{t.leaderboardDesc}</p>
          <span className="action-btn">{t.viewRankings}</span>
        </div>

        {user?.role === 'admin' && (
          <div className="action-card action-card-admin" onClick={() => navigate('/admin')}>
            <div className="action-icon">⚙️</div>
            <h2>{t.adminPanel}</h2>
            <p>{t.adminPanelDesc(users.length)}</p>
            <span className="action-btn">{t.manage}</span>
          </div>
        )}
      </div>

      <div className="mascot-section">
        <div className="mascot">🦊</div>
        <div className="mascot-speech">{mascotMessage}</div>
      </div>

      {achievements && (
        <div className="achievement-section" style={{ marginTop: '2rem' }}>
          <h2 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{t.achievements}</h2>
          <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {t.earned(achievements.earned_count, achievements.total_count)}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {achievements.achievements.map(ach => (
                <AchievementBadge key={ach.key} achievement={ach} />
              ))}
            </div>
          </div>
        </div>
      )}

      <AchievementToast achievement={newAchievement} onClose={() => setNewAchievement(null)} />
    </div>
  );
}
