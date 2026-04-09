import type { DailyChallengeStatus } from '../../services/api';

interface Props {
  status: DailyChallengeStatus;
  onStart: () => void;
}

export default function DailyChallengeCard({ status, onStart }: Props) {
  const completed = status.attempt?.completed;
  const score = status.attempt?.score;
  const total = status.challenge.total_problems;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '1rem',
      padding: '1.25rem',
      color: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '2rem' }}>🎯</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>每日挑戰</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{status.challenge.title}</div>
        </div>
      </div>

      {completed ? (
        <div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>挑戰完成！</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {score} / {total} 题正确 🎉
          </div>
          {status.attempt?.time_taken_seconds && (
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem' }}>
              用時 {Math.floor(status.attempt.time_taken_seconds / 60)}分 {status.attempt.time_taken_seconds % 60}秒
            </div>
          )}
          <div style={{
            marginTop: '0.75rem',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
            display: 'inline-block',
            fontSize: '0.8rem',
          }}>
            ✅ 明日再来
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            今日还没挑战！快来试试 🎯
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.75rem' }}>
            共 {total} 题 · 不限时间
          </div>
          <button
            onClick={onStart}
            style={{
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 1.25rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            開始挑戰 →
          </button>
        </div>
      )}
    </div>
  );
}