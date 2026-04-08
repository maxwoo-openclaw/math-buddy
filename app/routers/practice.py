import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.schemas import SessionCreate, AnswerSubmit, SessionStatsResponse
from app.services.practice_service import PracticeService
from app.routers.users import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/practice", tags=["practice"])


@router.post("/session", status_code=201)
async def start_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PracticeService(db)
    session = await service.start_session(current_user.id, data)
    return {"session_id": session.id, "started_at": session.started_at}


@router.post("/session/{session_id}/answer")
async def submit_answer(
    session_id: int,
    data: AnswerSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info(f"[submit_answer] session_id={session_id}, data={data}")
    service = PracticeService(db)
    try:
        result = await service.submit_answer(session_id, data)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/session/{session_id}/stats", response_model=SessionStatsResponse)
async def get_session_stats(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PracticeService(db)
    try:
        stats = await service.get_session_stats(session_id)
        return SessionStatsResponse(**stats)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/problem")
async def get_problem(
    operation: str | None = None,
    difficulty: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PracticeService(db)
    problem = await service.get_random_problem(operation, difficulty)
    if not problem:
        raise HTTPException(status_code=404, detail="No problem available")
    return {
        "id": problem.id,
        "operation_type": problem.operation_type,
        "difficulty": problem.difficulty,
        "question": problem.question,
    }


@router.post("/session/{session_id}/complete")
async def complete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PracticeService(db)
    await service.complete_session(session_id)
    return {"message": "Session completed"}