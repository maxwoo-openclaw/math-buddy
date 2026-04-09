from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import User
from app.services.leaderboard_service import LeaderboardService
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


@router.get("/")
async def get_leaderboard(
    filter: str = Query("all", pattern="^(all|weekly)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = LeaderboardService(db)
    return await service.get_leaderboard(filter)


@router.get("/me")
async def get_my_rank(
    filter: str = Query("all", pattern="^(all|weekly)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = LeaderboardService(db)
    rank = await service.get_user_rank(current_user.id, filter)
    return {"rank": rank}
