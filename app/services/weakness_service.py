from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func
from datetime import datetime, timezone
import json

from app.models.weakness import MistakePattern
from app.models.models import PracticeSession, SessionAnswer, MathProblem


class WeaknessService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_answer(
        self,
        user_id: int,
        operation: str,
        operand_a: int,
        operand_b: int,
        user_answer: int,
        correct_answer: int,
    ) -> MistakePattern | None:
        """Record a right or wrong answer. Returns pattern if it's a new weakness or confirmed weakness."""
        is_correct = user_answer == correct_answer

        result = await self.db.execute(
            select(MistakePattern).where(
                MistakePattern.user_id == user_id,
                MistakePattern.operation == operation,
                MistakePattern.operand_a == operand_a,
                MistakePattern.operand_b == operand_b,
            )
        )
        pattern = result.scalar_one_or_none()

        now_ts = int(datetime.now(timezone.utc).timestamp())
        history_entry = json.dumps({
            "date": datetime.now(timezone.utc).isoformat(),
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
        })

        if not pattern:
            pattern = MistakePattern(
                user_id=user_id,
                operation=operation,
                operand_a=operand_a,
                operand_b=operand_b,
                wrong_count=0,
                correct_count=0,
                history="[]",
            )
            self.db.add(pattern)

        # Update counts
        if is_correct:
            pattern.correct_count += 1
        else:
            pattern.wrong_count += 1

        pattern.last_attempted = now_ts

        # Append to history (keep last 20 entries)
        history = json.loads(pattern.history or "[]")
        history.append(history_entry)
        history = history[-20:]
        pattern.history = json.dumps(history)

        await self.db.commit()
        await self.db.refresh(pattern)

        # Return pattern if wrong AND this is now a known weakness (2+ wrong)
        if not is_correct and pattern.wrong_count >= 2:
            return pattern
        return None

    async def get_weaknesses(self, user_id: int, limit: int = 5) -> list[dict]:
        """Get top weaknesses: pairs with highest wrong_count ratio"""
        result = await self.db.execute(
            select(MistakePattern)
            .where(MistakePattern.user_id == user_id)
            .where(MistakePattern.wrong_count >= 2)
            .order_by(
                (MistakePattern.wrong_count * 1.0 / (MistakePattern.wrong_count + MistakePattern.correct_count + 1)).desc()
            )
            .limit(limit)
        )
        patterns = result.scalars().all()

        weaknesses = []
        for p in patterns:
            total = p.wrong_count + p.correct_count
            weaknesses.append({
                "id": p.id,
                "operation": p.operation,
                "operand_a": p.operand_a,
                "operand_b": p.operand_b,
                "question": self._format_question(p.operation, p.operand_a, p.operand_b),
                "wrong_count": p.wrong_count,
                "correct_count": p.correct_count,
                "accuracy": round(p.correct_count / total * 100, 1) if total > 0 else 0,
            })
        return weaknesses

    def _format_question(self, operation: str, a: int, b: int) -> str:
        if operation == "addition":
            return f"{a} + {b} = ?"
        elif operation == "subtraction":
            return f"{a} - {b} = ?"
        elif operation == "multiplication":
            return f"{a} × {b} = ?"
        elif operation == "division":
            return f"{a} ÷ {b} = ?"
        return f"{a} ? {b}"

    async def get_operation_accuracy(self, user_id: int) -> dict:
        """Per-operation accuracy for skill tree display"""
        result = await self.db.execute(
            select(MistakePattern).where(MistakePattern.user_id == user_id)
        )
        patterns = result.scalars().all()

        ops = {"addition": {"correct": 0, "total": 0},
               "subtraction": {"correct": 0, "total": 0},
               "multiplication": {"correct": 0, "total": 0},
               "division": {"correct": 0, "total": 0}}

        for p in patterns:
            ops[p.operation]["correct"] += p.correct_count
            ops[p.operation]["total"] += p.wrong_count + p.correct_count

        return {
            op: {
                "accuracy": round(d["correct"] / d["total"] * 100, 1) if d["total"] > 0 else 0,
                "total_attempts": d["total"],
            }
            for op, d in ops.items()
        }