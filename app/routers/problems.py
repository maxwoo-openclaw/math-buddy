from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.database import get_db
from app.models import User, MathProblem
from app.schemas import ProblemCreate, ProblemUpdate, ProblemResponse
from app.services.problem_service import ProblemService
from app.routers.users import get_current_user, get_admin_user

router = APIRouter(prefix="/api/problems", tags=["problems"])


@router.get("/", response_model=list[ProblemResponse])
async def list_problems(
    operation: Optional[str] = None,
    difficulty: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProblemService(db)
    problems = await service.list_problems(operation=operation, difficulty=difficulty)
    return [ProblemResponse.model_validate(p) for p in problems]


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ProblemService(db)
    problem = await service.get_problem(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return ProblemResponse.model_validate(problem)


@router.post("/", response_model=ProblemResponse)
async def create_problem(
    data: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    service = ProblemService(db)
    problem = await service.create_problem(data, current_user.id)
    return ProblemResponse.model_validate(problem)


@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: int,
    data: ProblemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    service = ProblemService(db)
    problem = await service.update_problem(problem_id, data)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    return ProblemResponse.model_validate(problem)


@router.delete("/{problem_id}")
async def delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    service = ProblemService(db)
    deleted = await service.delete_problem(problem_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Problem not found")
    return {"message": "Problem deleted"}