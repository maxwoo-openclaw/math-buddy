import { useEffect, useState } from 'react';
import { getSkillTree, getOperationAccuracy } from '../../services/api';
import { useLocale } from '../../store/localeContext';

interface Skill {
  operation: string;
  level: number;
  xp: number;
  xp_for_next: number;
}

interface OpAccuracy {
  accuracy: number;
  total_attempts: number;
}

const OP_COLORS: Record<string, string> = {
  addition: '#4CAF50',
  subtraction: '#2196F3',
  multiplication: '#FF9800',
  division: '#9C27B0',
};

export default function SkillTreeCard() {
  const { t } = useLocale();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [opAccuracy, setOpAccuracy] = useState<Record<string, OpAccuracy>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSkillTree(),
      getOperationAccuracy(),
    ]).then(([treeData, accData]) => {
      setSkills(treeData.skills || []);
      setOpAccuracy(accData || {});
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const opIcon: Record<string, string> = {
    addition: '➕',
    subtraction: '➖',
    multiplication: '✖️',
    division: '➗',
  };

  const opLabel = (op: string): string => {
    switch (op) {
      case 'addition': return t.addition;
      case 'subtraction': return t.subtraction;
      case 'multiplication': return t.multiplication;
      case 'division': return t.division;
      default: return op;
    }
  };

  if (loading) return <div className="skill-tree-card"><div className="stat-label">{t.loading || 'Loading...'}</div></div>;

  return (
    <div className="skill-tree-card">
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#374151' }}>
        🌳 {t.skillTree || 'Skill Tree'}
      </h3>

      {/* Operation accuracy bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {Object.entries(opAccuracy).map(([op, data]) => {
          const pct = data.accuracy;
          const color = OP_COLORS[op] || '#888';
          return (
            <div key={op}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                <span>{opIcon[op]} {opLabel(op)}</span>
                <span style={{ color: '#6b7280' }}>{pct}% ({data.total_attempts} {t.problems || 'problems'})</span>
              </div>
              <div style={{ background: '#f3f4f6', borderRadius: 8, height: 10 }}>
                <div style={{
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 8,
                  height: '100%',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Level badges */}
      {skills.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {skills.map((skill) => {
            const color = OP_COLORS[skill.operation] || '#888';
            return (
              <div key={skill.operation} style={{
                background: color + '22',
                border: `2px solid ${color}`,
                borderRadius: 12,
                padding: '6px 12px',
                textAlign: 'center',
                minWidth: 72,
              }}>
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{opIcon[skill.operation]} {opLabel(skill.operation)}</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color }}>
                  Lv{skill.level}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {skills.length === 0 && opAccuracy && Object.keys(opAccuracy).length > 0 && (
        <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
          {t.practiceMore || 'Do more practice to level up your skills! 🌟'}
        </p>
      )}
    </div>
  );
}
