import type { StreakInfo } from '../../services/api';

interface Props {
  streak: StreakInfo;
}

export default function StreakCard({ streak }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const practicedToday = streak.streak_dates?.includes(today);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
      borderRadius: '1rem',
      padding: '1.25rem',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <div style={{ fontSize: '2.5rem' }}>🔥</div>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>
          {streak.current_streak}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '0.25rem' }}>
          日連續
        </div>
      </div>
      <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>最長</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{streak.longest_streak} 天</div>
        {practicedToday && (
          <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', background: 'rgba(255,255,255,0.25)', borderRadius: '99px', padding: '2px 8px', display: 'inline-block' }}>
            ✅ 今天已完成
          </div>
        )}
      </div>
    </div>
  );
}