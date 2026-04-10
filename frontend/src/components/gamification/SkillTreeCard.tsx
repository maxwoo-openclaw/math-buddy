import { useEffect, useState } from 'react';
import { getSkillTree, getOperationAccuracy } from '../../services/api';

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

const OP_LABELS: Record<string, string> = {
  addition: '➕ 加法',
  subtraction: '➖ 減法',
  multiplication: '✖️ 乘法',
  division: '➗ 除法',
};

const OP_COLORS: Record<string, string> = {
  addition: '#4CAF50',
  subtraction: '#2196F3',
  multiplication: '#FF9800',
  division: '#9C27B0',
};

export default function SkillTreeCard() {
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

  if (loading) return <div className="stat-card"><div className="stat-label">技能樹載入中...</div></div>;

  return (
    <div className="skill-tree-card">
      <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', color: '#374151' }}>
        🌳 技能樹
      </h3>

      {/* Operation accuracy bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {Object.entries(opAccuracy).map(([op, data]) => {
          const pct = data.accuracy;
          const color = OP_COLORS[op] || '#888';
          return (
            <div key={op}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                <span>{OP_LABELS[op] || op}</span>
                <span style={{ color: '#6b7280' }}>{pct}% ({data.total_attempts}題)</span>
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
                <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{OP_LABELS[skill.operation]?.split(' ')[1] || skill.operation}</div>
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
          做更多練習題來提升技能等級！🌟
        </p>
      )}
    </div>
  );
}