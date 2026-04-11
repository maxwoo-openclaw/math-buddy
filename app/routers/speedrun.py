import logging
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.services.speedrun_service import SpeedRunService, SkillTreeService
from app.routers.users import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/gamification", tags=["gamification"])


# ─── Speed Run ────────────────────────────────────────────────

class SpeedRunSubmitRequest(BaseModel):
    time_limit_seconds: int
    difficulty: str
    score: int
    total_problems: int
    time_taken_seconds: int | None = None


class SpeedRunResultResponse(BaseModel):
    id: int
    time_limit_seconds: int
    score: int
    total_problems: int
    accuracy: int
    time_taken_seconds: int | None


@router.post("/speed-run/submit")
async def submit_speed_run(
    data: SpeedRunSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SpeedRunService(db)
    result = await service.submit_result(
        user_id=current_user.id,
        time_limit_seconds=data.time_limit_seconds,
        difficulty=data.difficulty,
        score=data.score,
        total_problems=data.total_problems,
        time_taken_seconds=data.time_taken_seconds,
    )
    return {
        "id": result.id,
        "time_limit_seconds": result.time_limit_seconds,
        "score": result.score,
        "total_problems": result.total_problems,
        "accuracy": result.accuracy,
        "time_taken_seconds": result.time_taken_seconds,
    }


@router.get("/speed-run/best")
async def get_best_speed_run(
    time_limit: int = Query(..., description="60 or 120 seconds"),
    difficulty: str = Query(..., description="easy, medium, or hard"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SpeedRunService(db)
    result = await service.get_best_result(current_user.id, time_limit, difficulty)
    if not result:
        return None
    return {
        "id": result.id,
        "time_limit_seconds": result.time_limit_seconds,
        "difficulty": result.difficulty,
        "score": result.score,
        "total_problems": result.total_problems,
        "accuracy": result.accuracy,
        "time_taken_seconds": result.time_taken_seconds,
    }


@router.get("/speed-run/leaderboard")
async def get_speed_run_leaderboard(
    time_limit: int = Query(..., description="60 or 120 seconds"),
    difficulty: str = Query(..., description="easy, medium, or hard"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SpeedRunService(db)
    rows = await service.get_leaderboard(time_limit, difficulty, limit)
    leaderboard = [
        {"user_id": r.user_id, "username": r.username, "score": r.best_score}
        for r in rows
    ]

    # Find current user's rank
    my_rank = await service.get_user_rank(current_user.id, time_limit, difficulty)
    total_users = await service.get_total_participants(time_limit, difficulty)

    return {
        "leaderboard": leaderboard,
        "my_rank": my_rank,
        "total_participants": total_users,
    }


# ─── Skill Tree ────────────────────────────────────────────────

@router.get("/skill-tree")
async def get_skill_tree(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SkillTreeService(db)
    skills = await service.get_user_skills(current_user.id)
    stats = await service.get_operation_stats(current_user.id)
    return {"skills": skills, "operation_stats": stats}


class XpAwardRequest(BaseModel):
    operation: str
    correct: bool
    response_time_ms: int = 5000


@router.post("/skill-tree/xp")
async def award_xp(
    data: XpAwardRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = SkillTreeService(db)
    result = await service.award_xp(
        user_id=current_user.id,
        operation=data.operation,
        correct=data.correct,
        response_time_ms=data.response_time_ms,
    )
    return result or {"xp_earned": 0, "level_up": None}