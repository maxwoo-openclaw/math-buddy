import { useMemo } from 'react';
import { useLocale } from '../../store/localeContext';

interface Props {
  filter: 'all' | 'weekly';
}

function getWeekRange(): { start: Date; end: Date; label: string; daysUntilReset: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const daysUntilReset = 7 - daysFromMonday;

  const formatDate = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`;

  return {
    start: weekStart,
    end: weekEnd,
    label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
    daysUntilReset,
  };
}

export default function WeeklyResetBanner({ filter }: Props) {
  const { t } = useLocale();
  const week = useMemo(() => getWeekRange(), []);

  if (filter !== 'weekly') return null;

  const resetText = week.daysUntilReset === 0
    ? (t.resetToday || '⚠️ Resets today')
    : week.daysUntilReset === 1
    ? (t.resetTomorrow || '⏰ Resets tomorrow')
    : `${week.daysUntilReset}${t.days || 'days'} ${t.untilReset || 'until reset'}`;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
      borderRadius: '1rem',
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      border: '1px solid #c4b5fd',
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#5b21b6' }}>
          📅 {t.weeklyLeaderboard || 'Weekly Leaderboard'} — Week of {week.label}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: 2 }}>
          {t.weeklyRankingNote || 'Rankings reset weekly based on problems solved'}
        </div>
      </div>
      <div style={{
        background: '#7c3aed',
        color: 'white',
        borderRadius: '0.5rem',
        padding: '4px 10px',
        fontSize: '0.75rem',
        fontWeight: 700,
      }}>
        {resetText}
      </div>
    </div>
  );
}
