import type { Achievement } from '../../services/api';

interface Props {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
}

export default function AchievementBadge({ achievement, size = 'md' }: Props) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl'
  };
  
  const borderColors = {
    consistency: 'border-yellow-400',
    operation: 'border-blue-400',
    milestone: 'border-purple-400'
  };
  
  return (
    <div 
      className={`
        ${sizeClasses[size]}
        rounded-full border-4 flex items-center justify-center
        ${achievement.earned 
          ? `${borderColors[achievement.category]} bg-white shadow-lg` 
          : 'border-gray-300 bg-gray-100 opacity-50'}
      `}
      title={achievement.earned ? `${achievement.name}: ${achievement.description}` : '???'}
    >
      {achievement.earned ? achievement.icon : '?'}
    </div>
  );
}
