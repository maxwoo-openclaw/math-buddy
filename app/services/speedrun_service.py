from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func
from datetime import datetime, timezone
from typing import Optional
import random

from app.models.speedrun import SpeedRunResult, SkillLevel
from app.models.models import PracticeSession, SessionAnswer, MathProblem, User
from app.models.gamification import UserStreak


# XP constants
XP_PER_CORRECT = 10
XP_SPEED_BONUS_MAX = 5  # max bonus for fast answers (<3 seconds)
XP_PER_LEVEL = lambda level: level * 200  # L1→L2 needs 200, L2→L3 needs 300...


class SpeedRunService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def submit_result(
        self,
        user_id: int,
        time_limit_seconds: int,
        score: int,
        total_problems: int,
        time_taken_seconds: Optional[int] = None,
    ) -> SpeedRunResult:
        accuracy = int(score / total_problems * 100) if total_problems > 0 else 0
        result = SpeedRunResult(
            user_id=user_id,
            time_limit_seconds=time_limit_seconds,
            score=score,
            total_problems=total_problems,
            accuracy=accuracy,
            time_taken_seconds=time_taken_seconds,
        )
        self.db.add(result)
        await self.db.commit()
        await self.db.refresh(result)
        return result

    async def get_best_result(self, user_id: int, time_limit_seconds: int) -> Optional[SpeedRunResult]:
        result = await self.db.execute(
            select(SpeedRunResult)
            .where(SpeedRunResult.user_id == user_id)
            .where(SpeedRunResult.time_limit_seconds == time_limit_seconds)
            .order_by(SpeedRunResult.score.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_leaderboard(self, time_limit_seconds: int, limit: int = 10) -> list:
        from sqlalchemy import func, distinct, over
        from sqlalchemy.orm import aliased

        # Window function: rank each user's runs by score desc, time asc
        ranked_subq = (
            select(
                SpeedRunResult.id,
                SpeedRunResult.user_id,
                User.username,
                SpeedRunResult.score,
                over(
                    func.row_number().over(
                        partition_by=SpeedRunResult.user_id,
                        order_by=[SpeedRunResult.score.desc(), SpeedRunResult.time_taken_seconds.asc().nullslast()]
                    ).label("rank")
                ),
            )
            .join(User, SpeedRunResult.user_id == User.id)
            .where(SpeedRunResult.time_limit_seconds == time_limit_seconds)
            .subquery()
        )
        result = await self.db.execute(
            select(
                ranked_subq.c.user_id,
                ranked_subq.c.username,
                ranked_subq.c.score,
            )
            .where(ranked_subq.c.rank == 1)
            .order_by(ranked_subq.c.score.desc())
            .limit(limit)
        )
        return result.all()

    async def get_user_rank(self, user_id: int, time_limit_seconds: int) -> int | None:
        """Get the rank of a specific user (1-indexed)."""
        best_subq = (
            select(
                SpeedRunResult.user_id,
                sql_func.max(SpeedRunResult.score).label("best_score"),
            )
            .where(SpeedRunResult.time_limit_seconds == time_limit_seconds)
            .group_by(SpeedRunResult.user_id)
            .subquery()
        )
        result = await self.db.execute(
            select(sql_func.count())
            .select_from(best_subq)
            .where(best_subq.c.best_score > (
                select(best_subq.c.best_score)
                .where(best_subq.c.user_id == user_id)
            ))
        )
        rank = result.scalar()
        return (rank + 1) if rank is not None else None

    async def get_total_participants(self, time_limit_seconds: int) -> int:
        """Count unique users who have a score for this time limit."""
        result = await self.db.execute(
            select(sql_func.count(sql_func.distinct(SpeedRunResult.user_id)))
            .where(SpeedRunResult.time_limit_seconds == time_limit_seconds)
        )
        return result.scalar() or 0


class SkillTreeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_skills(self, user_id: int) -> list[dict]:
        result = await self.db.execute(
            select(SkillLevel).where(SkillLevel.user_id == user_id)
        )
        existing = {sl.operation: sl for sl in result.scalars().all()}

        all_ops = ["addition", "subtraction", "multiplication", "division"]
        icons = {"addition": "➕", "subtraction": "➖", "multiplication": "✖️", "division": "➗"}
        colors = {"addition": "#4CAF50", "subtraction": "#2196F3", "multiplication": "#FF9800", "division": "#9C27B0"}

        skills = []
        for op in all_ops:
            sl = existing.get(op)
            if sl:
                next_xp = self._xp_for_level(sl.level + 1)
                skills.append({
                    "operation": op,
                    "icon": icons[op],
                    "color": colors[op],
                    "level": sl.level,
                    "xp": sl.xp,
                    "total_xp": sl.total_xp,
                    "next_level_xp": next_xp,
                    "progress": round(sl.xp / next_xp * 100) if next_xp > 0 else 100,
                })
            else:
                skills.append({
                    "operation": op,
                    "icon": icons[op],
                    "color": colors[op],
                    "level": 0,
                    "xp": 0,
                    "total_xp": 0,
                    "next_level_xp": self._xp_for_level(1),
                    "progress": 0,
                })
        return skills

    def _xp_for_level(self, level: int) -> int:
        """XP needed to reach this level from previous."""
        if level <= 1:
            return 0
        return level * 200

    async def award_xp(self, user_id: int, operation: str, correct: bool, response_time_ms: int = 5000) -> dict | None:
        """Award XP for a problem answer. Returns level-up info if leveled up."""
        # Normalize operation
        op_map = {"+": "addition", "-": "subtraction", "*": "multiplication", "/": "division"}
        operation = op_map.get(operation, operation)

        if not correct:
            return None

        # Calculate XP: base + speed bonus
        xp_earned = XP_PER_CORRECT
        if response_time_ms < 3000:
            xp_earned += XP_SPEED_BONUS_MAX
        elif response_time_ms < 5000:
            xp_earned += 2

        # Get or create skill level
        result = await self.db.execute(
            select(SkillLevel).where(
                SkillLevel.user_id == user_id,
                SkillLevel.operation == operation,
            )
        )
        sl = result.scalar_one_or_none()

        if not sl:
            sl = SkillLevel(user_id=user_id, operation=operation, level=1, xp=0, total_xp=0)
            self.db.add(sl)

        sl.xp += xp_earned
        sl.total_xp += xp_earned

        level_up = None
        while sl.xp >= self._xp_for_level(sl.level + 1) and sl.level < 10:
            sl.xp -= self._xp_for_level(sl.level + 1)
            sl.level += 1
            level_up = {"new_level": sl.level, "xp_remaining": sl.xp}

        await self.db.commit()
        return {"xp_earned": xp_earned, "level_up": level_up}

    async def get_operation_stats(self, user_id: int) -> dict:
        """Get per-operation accuracy stats to show on skill tree."""
        result = await self.db.execute(
            select(PracticeSession).where(PracticeSession.user_id == user_id)
        )
        sessions = result.scalars().all()

        ops = {"addition": {"correct": 0, "total": 0},
               "subtraction": {"correct": 0, "total": 0},
               "multiplication": {"correct": 0, "total": 0},
               "division": {"correct": 0, "total": 0}}

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
                if problem and problem.operation_type in ops:
                    ops[problem.operation_type]["total"] += 1
                    if answer.is_correct:
                        ops[problem.operation_type]["correct"] += 1

        stats = {}
        for op, data in ops.items():
            accuracy = int(data["correct"] / data["total"] * 100) if data["total"] > 0 else 0
            stats[op] = {"accuracy": accuracy, "total_attempts": data["total"], "correct": data["correct"]}
        return stats