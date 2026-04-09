from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, timedelta
import secrets

from app.models import User, ParentStudentLink, PracticeSession, SessionAnswer, MathProblem
from app.services.weakness_service import WeaknessService


class ParentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_invite_code(self, student_id: int) -> tuple[str, datetime]:
        """Generate 72-hour invite code for student"""
        code = secrets.token_hex(4)  # 8-char code
        expires_at = datetime.now(timezone.utc) + timedelta(hours=72)

        result = await self.db.execute(select(User).where(User.id == student_id))
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError("Student not found")

        student.invite_code = code
        student.invite_expires_at = expires_at
        await self.db.commit()
        return code, expires_at

    async def link_by_code(self, parent_id: int, code: str) -> ParentStudentLink:
        """Link parent to student via invite code"""
        result = await self.db.execute(
            select(User).where(User.invite_code == code, User.role == "student")
        )
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError("Invalid invite code")

        if student.invite_expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
            raise ValueError("Invite code expired")

        # Check if already linked
        existing = await self.db.execute(
            select(ParentStudentLink).where(
                ParentStudentLink.parent_id == parent_id,
                ParentStudentLink.student_id == student.id
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already linked to this student")

        link = ParentStudentLink(
            parent_id=parent_id,
            student_id=student.id,
            linked_by="self"
        )
        student.invite_code = None  # consume code
        student.invite_expires_at = None
        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)
        return link

    async def admin_link_student(self, parent_id: int, student_id: int) -> ParentStudentLink:
        """Admin links parent to student"""
        link = ParentStudentLink(
            parent_id=parent_id,
            student_id=student_id,
            linked_by="admin"
        )
        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)
        return link

    async def get_linked_students(self, parent_id: int) -> list[dict]:
        """Get all students linked to a parent with core metrics"""
        result = await self.db.execute(
            select(ParentStudentLink).where(ParentStudentLink.parent_id == parent_id)
        )
        links = result.scalars().all()

        students_data = []
        for link in links:
            student = await self.db.get(User, link.student_id)

            # Get session stats
            sessions_result = await self.db.execute(
                select(PracticeSession).where(PracticeSession.user_id == student.id)
            )
            sessions = sessions_result.scalars().all()

            total_problems = sum(s.total_problems for s in sessions)
            correct_count = sum(s.correct_count for s in sessions)
            accuracy = (correct_count / total_problems * 100) if total_problems > 0 else 0

            students_data.append({
                "id": student.id,
                "username": student.username,
                "total_sessions": len(sessions),
                "total_problems": total_problems,
                "overall_accuracy": round(accuracy, 1)
            })

        return students_data

    async def get_student_analysis(self, student_id: int) -> dict:
        """Get detailed analysis for a student"""
        # Get all sessions for the student
        sessions_result = await self.db.execute(
            select(PracticeSession).where(PracticeSession.user_id == student_id)
        )
        sessions = sessions_result.scalars().all()
        session_ids = [s.id for s in sessions]

        # Get all answers for these sessions
        if session_ids:
            answers_result = await self.db.execute(
                select(SessionAnswer).where(SessionAnswer.session_id.in_(session_ids))
            )
            answers = answers_result.scalars().all()
            problem_ids = [a.problem_id for a in answers]
        else:
            answers = []
            problem_ids = []

        # Get problem details
        if problem_ids:
            problems_result = await self.db.execute(
                select(MathProblem).where(MathProblem.id.in_(problem_ids))
            )
            problems = {p.id: p for p in problems_result.scalars().all()}
        else:
            problems = {}

        # Aggregate by operation
        ops = {"addition": 0, "subtraction": 0, "multiplication": 0, "division": 0}
        ops_correct = {"addition": 0, "subtraction": 0, "multiplication": 0, "division": 0}
        diffs = {"easy": 0, "medium": 0, "hard": 0}
        diffs_correct = {"easy": 0, "medium": 0, "hard": 0}

        for answer in answers:
            problem = problems.get(answer.problem_id)
            if not problem:
                continue
            op = problem.operation_type
            diff = problem.difficulty
            if op in ops:
                ops[op] += 1
                if answer.is_correct:
                    ops_correct[op] += 1
            if diff in diffs:
                diffs[diff] += 1
                if answer.is_correct:
                    diffs_correct[diff] += 1

        operation_breakdown = {}
        for op in ops:
            attempted = ops[op]
            correct = ops_correct[op]
            operation_breakdown[op] = {
                "attempted": attempted,
                "accuracy": round(correct / attempted * 100, 1) if attempted > 0 else 0
            }

        difficulty_breakdown = {}
        for diff in diffs:
            attempted = diffs[diff]
            correct = diffs_correct[diff]
            difficulty_breakdown[diff] = {
                "attempted": attempted,
                "accuracy": round(correct / attempted * 100, 1) if attempted > 0 else 0
            }

        # Find weakest/strongest
        with_accuracy = [(k, v["accuracy"]) for k, v in operation_breakdown.items() if v["attempted"] > 0]
        if with_accuracy:
            weakest = min(with_accuracy, key=lambda x: x[1])
            strongest = max(with_accuracy, key=lambda x: x[1])
        else:
            weakest = strongest = (None, 0)

        # Get weaknesses from weakness service
        weakness_service = WeaknessService(self.db)
        weaknesses = await weakness_service.get_weaknesses(student_id, limit=5)

        return {
            "student_id": student_id,
            "operation_breakdown": operation_breakdown,
            "difficulty_breakdown": difficulty_breakdown,
            "weakest_operation": weakest[0],
            "strongest_operation": strongest[0],
            "weaknesses": weaknesses,
        }

    async def get_student_trends(self, student_id: int, days: int) -> list[dict]:
        """Get accuracy trend over N days"""
        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        result = await self.db.execute(
            select(PracticeSession).where(
                PracticeSession.user_id == student_id,
                PracticeSession.started_at >= start_date
            )
        )
        sessions = result.scalars().all()

        # Group by date
        daily_data = {}
        for s in sessions:
            date_str = s.started_at.strftime("%Y-%m-%d")
            if date_str not in daily_data:
                daily_data[date_str] = {"total": 0, "correct": 0}
            daily_data[date_str]["total"] += s.total_problems
            daily_data[date_str]["correct"] += s.correct_count

        trend = []
        for date_str in sorted(daily_data.keys()):
            d = daily_data[date_str]
            trend.append({
                "date": date_str,
                "accuracy": round(d["correct"] / d["total"] * 100, 1) if d["total"] > 0 else 0,
                "problems": d["total"]
            })

        return trend
