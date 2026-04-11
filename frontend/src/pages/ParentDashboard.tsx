import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../store/authContext';
import { useTheme } from '../store/themeContext';
import { useLocale } from '../store/localeContext';
import { parentApi } from '../services/parentApi';
import type { LinkedStudent, StudentAnalysis, TrendPoint } from '../types';

const OP_ICONS: Record<string, string> = { addition: '➕', subtraction: '➖', multiplication: '✖️', division: '➗' };
const OP_COLORS: Record<string, string> = { addition: '#4CAF50', subtraction: '#2196F3', multiplication: '#FF9800', division: '#9C27B0' };

export default function ParentDashboard() {
  const { t } = useLocale();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const navigate = useNavigate();

  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<StudentAnalysis | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [tab, setTab] = useState<'overview' | 'analysis' | 'trends'>('overview');
  const [trendDays, setTrendDays] = useState(7);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => {
    if (selectedStudent) {
      loadAnalysis(selectedStudent);
      loadTrends(selectedStudent, trendDays);
    }
  }, [selectedStudent, trendDays]);

  const loadDashboard = async () => {
    try {
      const data = await parentApi.getDashboard();
      setStudents(data.students);
      if (data.students.length > 0 && !selectedStudent) setSelectedStudent(data.students[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadAnalysis = async (id: number) => {
    try { const d = await parentApi.getAnalysis(id); setAnalysis(d); } catch (err) { console.error(err); }
  };

  const loadTrends = async (id: number, days: number) => {
    try { const d = await parentApi.getTrends(id, days); setTrends(d); } catch (err) { console.error(err); }
  };

  const handleLink = async () => {
    if (!linkCode.trim()) return;
    setLinkError(''); setLinkSuccess('');
    try {
      await parentApi.linkByCode(linkCode.trim());
      setLinkSuccess(t.linkSuccess || 'Student linked successfully!');
      setLinkCode('');
      loadDashboard();
    } catch (err: unknown) {
      setLinkError(err instanceof Error ? err.message : (t.linkFailed || 'Failed to link student'));
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text)' }}>{t.loading}</div>;

  const current = students.find(s => s.id === selectedStudent);

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>👨‍👩‍👧 {t.parentDashboard}</h1>
          {user && <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.25rem' }}>{t.welcome(user.username)}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px 8px' }} title="Toggle dark mode">{theme === 'dark' ? '☀️' : '🌙'}</button>
          <button onClick={() => setLocale(locale === 'en' ? 'zhTW' : 'en')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: '4px 8px', color: '#666' }}>{locale === 'en' ? '中文' : 'EN'}</button>
          <button onClick={() => { logout(); navigate('/auth'); }} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '13px' }}>{t.logout?.split(' ')[0] || 'Logout'}</button>
        </div>
      </div>

      {/* Link Student Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>🔗 {(t as any).linkStudent || 'Link a Student'}</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={linkCode}
            onChange={e => setLinkCode(e.target.value)}
            placeholder={(t as any).enterStudentCode || 'Enter student invite code'}
            style={{ flex: 1, minWidth: 200, padding: '0.6rem 1rem', border: '2px solid #ddd', borderRadius: '8px', fontSize: '0.95rem' }}
          />
          <button onClick={handleLink} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
            {(t as any).linkStudentBtn || 'Link'}
          </button>
        </div>
        {linkError && <div style={{ color: '#f44336', marginTop: '0.5rem', fontSize: '0.85rem' }}>{linkError}</div>}
        {linkSuccess && <div style={{ color: '#4CAF50', marginTop: '0.5rem', fontSize: '0.85rem' }}>{linkSuccess}</div>}
      </div>

      {/* No students state */}
      {students.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👶</div>
          <h3 style={{ marginBottom: '0.5rem' }}>{t.noChildren}</h3>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>{t.noChildrenHint || 'Ask your child to generate an invite code from their dashboard, then enter it above.'}</p>
        </div>
      )}

      {/* Student selector + tabs */}
      {current && (
        <>
          {/* Student tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStudent(s.id)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  background: s.id === selectedStudent ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0',
                  color: s.id === selectedStudent ? 'white' : '#333',
                }}
              >
                {s.username}
              </button>
            ))}
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['overview', 'analysis', 'trends'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  background: tab === t ? 'var(--primary)' : '#f0f0f0',
                  color: tab === t ? 'white' : '#666',
                }}
              >
                {t === 'overview' ? ((t as any).overviewTab || ('Overview')) : t === 'analysis' ? ((t as any).analysisTab || ('Analysis')) : ((t as any).trendsTab || ('Trends'))}
              </button>
            ))}
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📚</div>
                <div className="stat-value">{current.total_sessions}</div>
                <div className="stat-label">{t.totalSessions || 'Total Sessions'}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-value">{current.total_problems}</div>
                <div className="stat-label">{t.problemsSolved}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🎯</div>
                <div className="stat-value">{current.overall_accuracy}%</div>
                <div className="stat-label">{t.accuracy}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-value">{current.overall_accuracy || 0}</div>
                <div className="stat-label">{t.dayStreak || 'Day Streak'}</div>
              </div>
            </div>
          )}

          {/* Analysis */}
          {tab === 'analysis' && analysis && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              {Object.entries(analysis.operation_breakdown || {}).map(([op, data]: [string, any]) => (
                <div key={op} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{OP_ICONS[op] || '🔢'}</span>
                    <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{op}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: OP_COLORS[op] || '#333' }}>{data.accuracy || 0}%</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>{t.accuracy}</div>
                    </div>
                    <div style={{ background: '#f9f9f9', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: OP_COLORS[op] || '#333' }}>{data.total_attempts || 0}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>{t.problemsSolved}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trends */}
          {tab === 'trends' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>📈 {t.weeklyProgress}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[7, 14, 30].map(d => (
                    <button
                      key={d}
                      onClick={() => setTrendDays(d)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: trendDays === d ? 'var(--primary)' : '#eee',
                        color: trendDays === d ? 'white' : '#666',
                      }}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              {trends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>{t.noData}</div>
              ) : (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#667eea" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .dashboard-container { padding: 1rem; max-width: 900px; margin: 0 auto; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
        .stat-card { background: white; border-radius: 1rem; padding: 1.25rem; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .stat-icon { font-size: 2rem; margin-bottom: 0.25rem; }
        .stat-value { font-size: 2rem; font-weight: 800; color: var(--primary, #667eea); }
        .stat-label { font-size: 0.8rem; color: #888; margin-top: 0.25rem; }
        .card { background: white; border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .btn { padding: 0.6rem 1.25rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 700; }
        .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .btn-secondary { background: #f0f0f0; color: #333; }
        [data-theme="dark"] .stat-card, [data-theme="dark"] .card { background: var(--card-bg, #16213e); }
        [data-theme="dark"] .stat-label { color: #aaa; }
        [data-theme="dark"] .btn-secondary { background: #1a1a2e; color: #e0e0e0; }
      `}</style>
    </div>
  );
}


