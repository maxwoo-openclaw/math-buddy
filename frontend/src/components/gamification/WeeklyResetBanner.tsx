import { useMemo } from 'react';

interface Props {
  filter: 'all' | 'weekly';
}

function getWeekRange(): { start: Date; end: Date; label: string; daysUntilReset: number } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  // Monday = start of week
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Days until Sunday midnight (reset)
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
  const week = useMemo(() => getWeekRange(), []);

  if (filter !== 'weekly') return null;

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
          📅 本週排行榜 · Week of {week.label}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: 2 }}>
          會根據本週答題數重新排名
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
        {week.daysUntilReset === 0
          ? '⚠️ 今日結算'
          : week.daysUntilReset === 1
          ? '⏰ 明日結算'
          : `${week.daysUntilReset}天後結算`}
      </div>
    </div>
  );
}