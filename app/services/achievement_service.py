from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models.achievement import Achievement, UserAchievement
from app.models.models import PracticeSession, SessionAnswer, MathProblem

ACHIEVEMENTS = [
    # Consistency
    {"key": "beginner", "name": "初學者", "icon": "🌟", "description": "Complete your first session", "category": "consistency"},
    {"key": "week_streak", "name": "坚持不懈", "icon": "🔥", "description": "Practice 7 consecutive days", "category": "consistency"},
    {"key": "dedicated", "name": "勤奋好学", "icon": "💪", "description": "Complete 50 sessions", "category": "consistency"},
    # Operation mastery
    {"key": "add_master", "name": "加法高手", "icon": "🧮", "description": "Addition accuracy ≥ 90% (30+ problems)", "category": "operation"},
    {"key": "sub_master", "name": "减法达人", "icon": "➖", "description": "Subtraction accuracy ≥ 90% (30+ problems)", "category": "operation"},
    {"key": "mul_master", "name": "乘法专家", "icon": "✖️", "description": "Multiplication accuracy ≥ 90% (30+ problems)", "category": "operation"},
    {"key": "div_master", "name": "除法大师", "icon": "➗", "description": "Division accuracy ≥ 90% (30+ problems)", "category": "operation"},
    # Milestones
    {"key": "perfect_session", "name": "百发百中", "icon": "🎯", "description": "100% accuracy in a session (5+ problems)", "category": "milestone"},
    {"key": "century", "name": "知识渊博", "icon": "📚", "description": "Solve 100 problems total", "category": "milestone"},
    {"key": "scholar", "name": "学富五车", "icon": "📖", "description": "Solve 500 problems total", "category": "milestone"},
    {"key": "polymath", "name": "博学多才", "icon": "🧠", "description": "Solve 1000 problems total", "category": "milestone"},
    {"key": "star_collector", "name": "星级玩家", "icon": "⭐", "description": "Earn 100 stars total", "category": "milestone"},
]


class AchievementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_seed_data(self):
        """Ensure all achievements exist in DB"""
        for ach in ACHIEVEMENTS:
            result = await self.db.execute(
                select(Achievement).where(Achievement.key == ach["key"])
            )
            if not result.scalar_one_or_none():
                achievement = Achievement(**ach)
                self.db.add(achievement)
        await self.db.commit()

    async def get_user_achievements(self, user_id: int) -> dict:
        """Get all achievements with earned status for a user"""
        await self.ensure_seed_data()
        
        result = await self.db.execute(select(Achievement))
        all_achievements = result.scalars().all()
        
        earned_result = await self.db.execute(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
        )
        earned = {ua.achievement_key: ua for ua in earned_result.scalars().all()}
        
        achievements = []
        for ach in all_achievements:
            achievements.append({
                "key": ach.key,
                "name": ach.name,
                "icon": ach.icon,
                "description": ach.description,
                "category": ach.category,
                "earned": ach.key in earned,
                "earned_at": earned[ach.key].earned_at.isoformat() if ach.key in earned else None
            })
        
        return {
            "achievements": achievements,
            "earned_count": len(earned),
            "total_count": len(all_achievements)
        }

    async def check_and_award(self, user_id: int, session_id: int = None) -> list[dict]:
        """Check achievements and award any newly unlocked ones."""
        await self.ensure_seed_data()
        
        earned_result = await self.db.execute(
            select(UserAchievement.achievement_key).where(UserAchievement.user_id == user_id)
        )
        already_earned = {row[0] for row in earned_result.all()}
        
        stats = await self._calculate_user_stats(user_id)
        
        new_achievements = []
        
        for ach in ACHIEVEMENTS:
            key = ach["key"]
            if key in already_earned:
                continue
            
            if self._check_achievement(key, stats, session_id):
                ua = UserAchievement(user_id=user_id, achievement_key=key)
                self.db.add(ua)
                new_achievements.append(ach)
        
        if new_achievements:
            await self.db.commit()
        
        return new_achievements

    def _check_achievement(self, key: str, stats: dict, session_id: int = None) -> bool:
        """Check if an achievement should be awarded based on stats"""
        if key == "beginner":
            return stats["total_sessions"] >= 1
        elif key == "week_streak":
            return stats["streak_days"] >= 7
        elif key == "dedicated":
            return stats["total_sessions"] >= 50
        elif key == "add_master":
            return stats["ops"]["addition"]["attempts"] >= 30 and stats["ops"]["addition"]["accuracy"] >= 90
        elif key == "sub_master":
            return stats["ops"]["subtraction"]["attempts"] >= 30 and stats["ops"]["subtraction"]["accuracy"] >= 90
        elif key == "mul_master":
            return stats["ops"]["multiplication"]["attempts"] >= 30 and stats["ops"]["multiplication"]["accuracy"] >= 90
        elif key == "div_master":
            return stats["ops"]["division"]["attempts"] >= 30 and stats["ops"]["division"]["accuracy"] >= 90
        elif key == "perfect_session":
            return stats["has_perfect_session"]
        elif key == "century":
            return stats["total_problems"] >= 100
        elif key == "scholar":
            return stats["total_problems"] >= 500
        elif key == "polymath":
            return stats["total_problems"] >= 1000
        elif key == "star_collector":
            return stats["total_stars"] >= 100
        return False

    async def _calculate_user_stats(self, user_id: int) -> dict:
        """Calculate all stats needed for achievement checking"""
        sessions_result = await self.db.execute(
            select(PracticeSession).where(PracticeSession.user_id == user_id)
        )
        sessions = sessions_result.scalars().all()
        
        total_sessions = len(sessions)
        total_problems = sum(s.total_problems for s in sessions)
        total_stars = sum(s.correct_count for s in sessions)
        streak_days = await self._calculate_streak(user_id)
        
        has_perfect_session = any(
            s.total_problems >= 5 and s.correct_count == s.total_problems
            for s in sessions
        )
        
        ops = {"addition": {"attempts": 0, "correct": 0},
               "subtraction": {"attempts": 0, "correct": 0},
               "multiplication": {"attempts": 0, "correct": 0},
               "division": {"attempts": 0, "correct": 0}}
        
        for session in sessions:
            answers_result = await self.db.execute(
                select(SessionAnswer).where(SessionAnswer.session_id == session.id)
            )
            answers = answers_result.scalars().all()
            
            for answer in answers:
                problem_result = await self.db.execute(
                    select(MathProblem).where(MathProblem.id == answer.problem_id)
                )
                problem = problem_result.scalar_one_or_none()
                if problem:
                    op = problem.operation_type
                    if op in ops:
                        ops[op]["attempts"] += 1
                        if answer.is_correct:
                            ops[op]["correct"] += 1
        
        for op in ops:
            if ops[op]["attempts"] > 0:
                ops[op]["accuracy"] = round(ops[op]["correct"] / ops[op]["attempts"] * 100, 1)
            else:
                ops[op]["accuracy"] = 0
        
        return {
            "total_sessions": total_sessions,
            "total_problems": total_problems,
            "total_stars": total_stars,
            "streak_days": streak_days,
            "has_perfect_session": has_perfect_session,
            "ops": ops
        }

    async def _calculate_streak(self, user_id: int) -> int:
        """Calculate consecutive days with at least one session"""
        today = datetime.now(timezone.utc).date()
        sessions_result = await self.db.execute(
            select(PracticeSession).where(PracticeSession.user_id == user_id)
        )
        sessions = sessions_result.scalars().all()
        
        practice_dates = set()
        for s in sessions:
            if s.started_at:
                practice_dates.add(s.started_at.date())
        
        if not practice_dates:
            return 0
        
        sorted_dates = sorted(practice_dates, reverse=True)
        
        streak = 0
        expected_date = today
        
        for d in sorted_dates:
            if d == expected_date or d == expected_date - timedelta(days=1):
                streak += 1
                expected_date = d - timedelta(days=1)
            else:
                break
        
        return streak
