from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import MathProblem
from app.schemas import ProblemCreate, ProblemUpdate
from typing import Optional


class ProblemService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_problems(
        self,
        operation: Optional[str] = None,
        difficulty: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[MathProblem]:
        query = select(MathProblem)
        if operation:
            query = query.where(MathProblem.operation_type == operation)
        if difficulty:
            query = query.where(MathProblem.difficulty == difficulty)
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_problem(self, problem_id: int) -> Optional[MathProblem]:
        result = await self.db.execute(select(MathProblem).where(MathProblem.id == problem_id))
        return result.scalar_one_or_none()

    async def create_problem(self, data: ProblemCreate, created_by: int) -> MathProblem:
        problem = MathProblem(
            operation_type=data.operation_type,
            difficulty=data.difficulty,
            question=data.question,
            answer=data.answer,
            created_by=created_by,
        )
        self.db.add(problem)
        await self.db.commit()
        await self.db.refresh(problem)
        return problem

    async def update_problem(self, problem_id: int, data: ProblemUpdate) -> Optional[MathProblem]:
        problem = await self.get_problem(problem_id)
        if not problem:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(problem, key, value)
        await self.db.commit()
        await self.db.refresh(problem)
        return problem

    async def delete_problem(self, problem_id: int) -> bool:
        problem = await self.get_problem(problem_id)
        if not problem:
            return False
        await self.db.delete(problem)
        await self.db.commit()
        return True