from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone, date
from typing import Optional
import json
import random

from app.models.gamification import UserStreak, DailyChallenge, DailyChallengeAttempt
from app.models.models import PracticeSession


CHALLENGE_TITLES = [
    "🎯 精準挑戰", "⚡ 速度之戰", "🧮 數學馬拉松", "🌟 智慧考驗",
    "🔥 熱身行動", "💪 刻苦訓練", "🏆 冠軍之路", "🧠 頭腦風暴",
]


class GamificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ─── STREAK ────────────────────────────────────────────────

    async def get_streak(self, user_id: int) -> dict:
        result = await self.db.execute(
            select(UserStreak).where(UserStreak.user_id == user_id)
        )
        streak = result.scalar_one_or_none()
        if not streak:
            return {"current_streak": 0, "longest_streak": 0, "last_practice_date": None, "streak_dates": []}

        dates = json.loads(streak.streak_dates or "[]")
        return {
            "current_streak": streak.current_streak,
            "longest_streak": streak.longest_streak,
            "last_practice_date": streak.last_practice_date.isoformat() if streak.last_practice_date else None,
            "streak_dates": dates,
        }

    async def record_practice_day(self, user_id: int) -> dict:
        """Call this after a practice session completes."""
        result = await self.db.execute(
            select(UserStreak).where(UserStreak.user_id == user_id)
        )
        streak = result.scalar_one_or_none()
        today = datetime.now(timezone.utc).date()
        today_str = today.isoformat()

        if not streak:
            streak = UserStreak(user_id=user_id, current_streak=1, longest_streak=1, last_practice_date=datetime.now(timezone.utc), streak_dates=json.dumps([today_str]))
            self.db.add(streak)
        else:
            dates = json.loads(streak.streak_dates or "[]")

            if streak.last_practice_date:
                last_date = streak.last_practice_date.date()
                if last_date == today:
                    # Already recorded today, no change
                    pass
                elif last_date == today - timedelta(days=1):
                    # Consecutive day
                    streak.current_streak += 1
                    if streak.current_streak > streak.longest_streak:
                        streak.longest_streak = streak.current_streak
                else:
                    # Streak broken, reset
                    streak.current_streak = 1

                # Update last practice date
                streak.last_practice_date = datetime.now(timezone.utc)
                if today_str not in dates:
                    dates.append(today_str)
                streak.streak_dates = json.dumps(dates)
            else:
                streak.current_streak = 1
                streak.last_practice_date = datetime.now(timezone.utc)
                dates = [today_str]
                streak.streak_dates = json.dumps(dates)

        await self.db.commit()
        return await self.get_streak(user_id)

    # ─── DAILY CHALLENGE ────────────────────────────────────────

    async def get_or_create_today_challenge(self) -> DailyChallenge:
        today_str = date.today().isoformat()
        result = await self.db.execute(
            select(DailyChallenge).where(DailyChallenge.target_date == today_str)
        )
        challenge = result.scalar_one_or_none()
        if challenge:
            return challenge

        # Generate new challenge
        challenge = DailyChallenge(
            target_date=today_str,
            title=random.choice(CHALLENGE_TITLES),
            description="每日數學挑戰，等你嚟挑戰！",
            total_problems=10,
        )
        self.db.add(challenge)
        await self.db.commit()
        await self.db.refresh(challenge)
        return challenge

    async def submit_daily_challenge(
        self,
        user_id: int,
        score: int,
        total_problems: int,
        time_taken_seconds: Optional[int] = None,
    ) -> dict:
        challenge = await self.get_or_create_today_challenge()

        result = await self.db.execute(
            select(DailyChallengeAttempt).where(
                DailyChallengeAttempt.challenge_id == challenge.id,
                DailyChallengeAttempt.user_id == user_id,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Only update if new score is better
            if score > existing.score:
                existing.score = score
                existing.total_problems = total_problems
                existing.time_taken_seconds = time_taken_seconds
                existing.completed_at = datetime.now(timezone.utc)
                await self.db.commit()
            return {"attempt_id": existing.id, "is_new_record": score > existing.score, "challenge_id": challenge.id}
        else:
            attempt = DailyChallengeAttempt(
                challenge_id=challenge.id,
                user_id=user_id,
                score=score,
                total_problems=total_problems,
                time_taken_seconds=time_taken_seconds,
            )
            self.db.add(attempt)
            await self.db.commit()
            await self.db.refresh(attempt)
            return {"attempt_id": attempt.id, "is_new_record": True, "challenge_id": challenge.id}

    async def get_daily_challenge_status(self, user_id: int) -> dict:
        challenge = await self.get_or_create_today_challenge()

        result = await self.db.execute(
            select(DailyChallengeAttempt).where(
                DailyChallengeAttempt.challenge_id == challenge.id,
                DailyChallengeAttempt.user_id == user_id,
            )
        )
        attempt = result.scalar_one_or_none()

        return {
            "challenge": {
                "id": challenge.id,
                "target_date": challenge.target_date,
                "title": challenge.title,
                "description": challenge.description,
                "total_problems": challenge.total_problems,
            },
            "attempt": {
                "completed": attempt is not None,
                "score": attempt.score if attempt else None,
                "total_problems": attempt.total_problems if attempt else None,
                "time_taken_seconds": attempt.time_taken_seconds if attempt else None,
            } if attempt else None,
        }