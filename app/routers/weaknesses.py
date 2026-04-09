import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.services.weakness_service import WeaknessService
from app.routers.users import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/weaknesses", tags=["weaknesses"])


@router.post("/record")
async def record_answer(
    operation: str,
    operand_a: int,
    operand_b: int,
    user_answer: int,
    correct_answer: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Record a problem attempt (right or wrong).
    Returns the mistake pattern if it's now a confirmed weakness (2+ wrong).
    """
    service = WeaknessService(db)
    weakness = await service.record_answer(
        user_id=current_user.id,
        operation=operation,
        operand_a=operand_a,
        operand_b=operand_b,
        user_answer=user_answer,
        correct_answer=correct_answer,
    )
    return {
        "weakness_confirmed": weakness is not None,
        "weakness": {
            "operation": weakness.operation,
            "question": f"{weakness.operand_a} × {weakness.operand_b} = ?",
            "wrong_count": weakness.wrong_count,
        } if weakness else None,
    }


@router.get("/")
async def get_weaknesses(
    limit: int = Query(5, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get top student weaknesses (pairs they get wrong most often).
    Used to show what to focus on in the parent dashboard.
    """
    service = WeaknessService(db)
    return await service.get_weaknesses(current_user.id, limit)


@router.get("/operation-accuracy")
async def get_operation_accuracy(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Per-operation accuracy derived from mistake pattern tracking.
    """
    service = WeaknessService(db)
    return await service.get_operation_accuracy(current_user.id)


class WeaknessReviewAnswerRequest(BaseModel):
    user_answer: int
    is_correct: bool


@router.post("/{review_id}/answer")
async def answer_weakness_review(
    review_id: int,
    data: WeaknessReviewAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit an answer to a weakness review problem.
    If correct 3 times, mark as mastered.
    """
    from app.models.weakpoint_review import WeaknessReview
    result = await db.execute(
        select(WeaknessReview).where(
            WeaknessReview.id == review_id,
            WeaknessReview.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Review not found")

    review.attempts += 1
    if data.is_correct:
        if review.attempts >= 3:
            review.is_mastered = 1
            review.mastered_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "is_mastered": bool(review.is_mastered),
        "attempts": review.attempts,
    }