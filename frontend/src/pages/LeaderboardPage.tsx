import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboard, getMyRank, type LeaderboardEntry, type LeaderboardResponse } from '../services/api';

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'weekly'>('all');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getLeaderboard(filter),
      getMyRank(filter),
    ]).then(([lb, rank]) => {
      setData(lb);
      setMyRank(rank.rank);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load leaderboard', err);
      setLoading(false);
    });
  }, [filter]);

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <div className="leaderboard-container" style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>🏆 排行榜</h1>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '0.75rem',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: filter === 'all' ? '#3b82f6' : '#e5e7eb',
            color: filter === 'all' ? 'white' : '#374151',
          }}
        >
          All-Time 總榜
        </button>
        <button
          onClick={() => setFilter('weekly')}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '0.75rem',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: filter === 'weekly' ? '#3b82f6' : '#e5e7eb',
            color: filter === 'weekly' ? 'white' : '#374151',
          }}
        >
          This Week 本週
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading...</p>
      ) : data ? (
        <>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {data.total_participants} 位學生參與
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data.entries.map((entry) => {
              const medal = getMedalEmoji(entry.rank);
              const isMe = myRank?.user_id === entry.user_id;

              return (
                <div
                  key={entry.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    background: isMe ? '#eff6ff' : 'white',
                    borderRadius: '0.75rem',
                    border: isMe ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width: '2rem',
                    fontWeight: 'bold',
                    color: medal ? '#374151' : '#6b7280',
                    fontSize: medal ? '1.5rem' : '1rem',
                  }}>
                    {medal || `#${entry.rank}`}
                  </div>

                  {/* Avatar placeholder */}
                  <div style={{
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: '50%',
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}>
                    {entry.tier_icon}
                  </div>

                  {/* Name + Tier */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', color: '#111827' }}>
                      {entry.username} {isMe && <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>(你)</span>}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{entry.tier}</p>
                  </div>

                  {/* Stars */}
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#111827' }}>⭐ {entry.stars}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* My rank if not in top entries */}
          {myRank && !data.entries.find(e => e.user_id === myRank.user_id) && (
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem' }}>你的排名</p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: '#eff6ff',
                borderRadius: '0.75rem',
                border: '2px solid #3b82f6',
              }}>
                <div style={{ width: '2rem', fontWeight: 'bold', color: '#6b7280' }}>#{myRank.rank}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600' }}>{myRank.username}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{myRank.tier}</p>
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>⭐ {myRank.stars}</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>暫時沒有數據</p>
      )}
    </div>
  );
}
