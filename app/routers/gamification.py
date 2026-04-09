import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.services.gamification_service import GamificationService
from app.routers.users import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/gamification", tags=["gamification"])


class DailyChallengeSubmitRequest(BaseModel):
    score: int
    total_problems: int
    time_taken_seconds: int | None = None


class DailyChallengeStatusResponse(BaseModel):
    challenge: dict
    attempt: dict | None


@router.get("/streak")
async def get_streak(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = GamificationService(db)
    return await service.get_streak(current_user.id)


@router.post("/streak/record")
async def record_practice_day(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Call this after a session completes to update streak."""
    service = GamificationService(db)
    return await service.record_practice_day(current_user.id)


@router.get("/daily-challenge")
async def get_daily_challenge_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DailyChallengeStatusResponse:
    service = GamificationService(db)
    return await service.get_daily_challenge_status(current_user.id)


@router.post("/daily-challenge/submit")
async def submit_daily_challenge(
    data: DailyChallengeSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = GamificationService(db)
    result = await service.submit_daily_challenge(
        user_id=current_user.id,
        score=data.score,
        total_problems=data.total_problems,
        time_taken_seconds=data.time_taken_seconds,
    )
    return result