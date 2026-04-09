from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import User
from app.services.achievement_service import AchievementService
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/achievements", tags=["achievements"])


@router.get("/")
async def get_achievements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AchievementService(db)
    return await service.get_user_achievements(current_user.id)


@router.post("/check")
async def check_achievements(
    session_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AchievementService(db)
    new_achievements = await service.check_and_award(current_user.id, session_id)
    return {"new_achievements": new_achievements}


@router.get("/parent/{student_id}")
async def get_student_achievements(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("parent", "admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AchievementService(db)
    return await service.get_user_achievements(student_id)
