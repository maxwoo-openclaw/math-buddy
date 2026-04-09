from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import MathProblem, PracticeSession, SessionAnswer, User
from app.schemas import SessionCreate, AnswerSubmit, AnswerResponse
from datetime import datetime, timezone
import random
import logging

logger = logging.getLogger(__name__)


class PracticeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _generate_problem(self, operation: str, difficulty: str) -> MathProblem:
        # Normalize operation symbols to names
        op_map = {"+": "addition", "-": "subtraction", "*": "multiplication", "/": "division"}
        operation = op_map.get(operation, operation)

        # Generate a random math problem based on operation and difficulty
        if difficulty == "easy":
            a = random.randint(1, 9)
            b = random.randint(1, 9)
        elif difficulty == "medium":
            a = random.randint(10, 99)
            b = random.randint(10, 99)
        else:  # hard
            a = random.randint(100, 999)
            b = random.randint(100, 999)

        if operation == "addition":
            answer = a + b
            question = f"{a} + {b} = ?"
        elif operation == "subtraction":
            # Ensure a >= b for positive result
            if a < b:
                a, b = b, a
            answer = a - b
            question = f"{a} - {b} = ?"
        elif operation == "multiplication":
            # Use smaller numbers for kids
            if difficulty == "hard":
                b = random.randint(2, 20)  # Keep one factor smaller
            answer = a * b
            question = f"{a} × {b} = ?"
        else:  # division
            # Generate division with exact integer result
            b = random.randint(1, 12 if difficulty == "easy" else 20 if difficulty == "medium" else 50)
            answer = random.randint(1, 12 if difficulty == "easy" else 20 if difficulty == "medium" else 100)
            a = answer * b
            question = f"{a} ÷ {b} = ?"

        return MathProblem(
            operation_type=operation,
            difficulty=difficulty,
            question=question,
            answer=answer,
            created_by=None,
        )

    async def start_session(self, user_id: int, data: SessionCreate) -> PracticeSession:
        session = PracticeSession(
            user_id=user_id,
            operation_filter=data.operation_filter,
            difficulty_filter=data.difficulty_filter,
            total_problems=0,
            correct_count=0,
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_random_problem(
        self,
        operation_filter: str | None = None,
        difficulty_filter: str | None = None,
    ) -> MathProblem | None:
        # Normalize operation symbols to names
        op_map = {"+": "addition", "-": "subtraction", "*": "multiplication", "/": "division"}
        operation_filter = op_map.get(operation_filter, operation_filter) if operation_filter else None

        operations = ["addition", "subtraction", "multiplication", "division"]
        difficulties = ["easy", "medium", "hard"]
        op = operation_filter or random.choice(operations)
        diff = difficulty_filter or random.choice(difficulties)
        logger.info(f"[get_random_problem] generating new problem: op={op}, diff={diff}")
        problem = await self._generate_problem(op, diff)
        self.db.add(problem)
        await self.db.commit()
        await self.db.refresh(problem)
        return problem

    async def submit_answer(
        self,
        session_id: int,
        user_id: int,
        data: AnswerSubmit,
    ) -> AnswerResponse:
        result = await self.db.execute(
            select(PracticeSession).where(PracticeSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Session not found")
        if session.user_id != user_id:
            raise ValueError("Unauthorized")

        result = await self.db.execute(
            select(MathProblem).where(MathProblem.id == data.problem_id)
        )
        problem = result.scalar_one_or_none()
        if not problem:
            raise ValueError("Problem not found")

        is_correct = data.user_answer == problem.answer

        # Update session stats
        session.total_problems += 1
        if is_correct:
            session.correct_count += 1

        # Record answer
        answer = SessionAnswer(
            session_id=session_id,
            problem_id=data.problem_id,
            user_answer=data.user_answer,
            is_correct=1 if is_correct else 0,
        )
        self.db.add(answer)
        await self.db.commit()

        return AnswerResponse(
            problem_id=data.problem_id,
            user_answer=data.user_answer,
            correct_answer=problem.answer,
            is_correct=is_correct,
        )

    async def get_session_stats(self, session_id: int, user_id: int) -> dict:
        result = await self.db.execute(
            select(PracticeSession).where(PracticeSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Session not found")
        if session.user_id != user_id:
            raise ValueError("Unauthorized")

        result = await self.db.execute(
            select(SessionAnswer).where(SessionAnswer.session_id == session_id)
        )
        answers = list(result.scalars().all())

        # Get problem details
        answer_responses = []
        for a in answers:
            result = await self.db.execute(
                select(MathProblem).where(MathProblem.id == a.problem_id)
            )
            problem = result.scalar_one_or_none()
            if problem:
                answer_responses.append(AnswerResponse(
                    problem_id=a.problem_id,
                    user_answer=a.user_answer,
                    correct_answer=problem.answer,
                    is_correct=bool(a.is_correct),
                ))

        accuracy = (session.correct_count / session.total_problems * 100) if session.total_problems > 0 else 0

        return {
            "session_id": session.id,
            "total_problems": session.total_problems,
            "correct_count": session.correct_count,
            "accuracy": round(accuracy, 1),
            "started_at": session.started_at,
            "completed_at": session.completed_at,
            "answers": answer_responses,
        }

    async def complete_session(self, session_id: int, user_id: int):
        result = await self.db.execute(
            select(PracticeSession).where(PracticeSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError("Session not found")
        if session.user_id != user_id:
            raise ValueError("Unauthorized")
        if session:
            session.completed_at = datetime.now(timezone.utc)
            await self.db.commit()
        # Check for new achievements
        achievement_service = AchievementService(self.db)
        await achievement_service.check_and_award(user_id, session_id)