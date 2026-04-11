import { useLocale } from '../../store/localeContext';
import type { DailyChallengeStatus } from '../../services/api';

interface Props {
  status: DailyChallengeStatus;
  onStart: () => void;
}

export default function DailyChallengeCard({ status, onStart }: Props) {
  const { t, locale } = useLocale();
  const completed = status.attempt?.completed;
  const score = status.attempt?.score;
  const total = status.challenge.total_problems;

  const mins = status.attempt?.time_taken_seconds
    ? Math.floor(status.attempt.time_taken_seconds / 60)
    : 0;
  const secs = status.attempt?.time_taken_seconds
    ? status.attempt.time_taken_seconds % 60
    : 0;

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
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {t.dailyChallenge || 'Daily Challenge'}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
            {locale === 'zhTW' ? status.challenge.title : (status.challenge.title_en || status.challenge.title)}
          </div>
        </div>
      </div>

      {completed ? (
        <div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            {t.challengeComplete || 'Challenge Complete!'}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {score} / {total} {t.accuracy || 'correct'}{' '}🎉
          </div>
          {status.attempt?.time_taken_seconds && (
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem' }}>
              {t.timeTaken || 'Time'}: {mins > 0 ? `${mins}m ` : ''}{secs}s
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
            ✅ {t.comingBack || 'See you tomorrow!'}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            {t.noChallengeToday || "You haven't done today's challenge yet! 🎯"}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.75rem' }}>
            {total} {t.problems || 'problems'} · {t.noTimeLimit || 'no time limit'}
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
            {(t.startChallenge || 'Start Challenge!')}
          </button>
        </div>
      )}
    </div>
  );
}
