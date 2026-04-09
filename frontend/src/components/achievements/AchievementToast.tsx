import { useEffect } from 'react';
import type { NewAchievement } from '../../services/api';

interface Props {
  achievement: NewAchievement | null;
  onClose: () => void;
}

export default function AchievementToast({ achievement, onClose }: Props) {
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);
  
  if (!achievement) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{achievement.icon}</span>
        <div>
          <p className="font-bold text-lg">🎉 新成就解锁！</p>
          <p className="font-semibold">{achievement.name}</p>
          <p className="text-sm opacity-80">{achievement.description}</p>
        </div>
        <button onClick={onClose} className="ml-4 text-white/80 hover:text-white text-xl">×</button>
      </div>
    </div>
  );
}
