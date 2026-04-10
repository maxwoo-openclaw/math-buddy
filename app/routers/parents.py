from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.services.parent_service import ParentService
from app.services.notification_service import NotificationService
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/parents", tags=["parents"])


def get_parent_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("parent", "admin"):
        raise HTTPException(status_code=403, detail="Parent or admin access required")
    return current_user


@router.post("/generate-code")
async def generate_invite_code(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=400, detail="Only students can generate invite codes")

    service = ParentService(db)
    try:
        code, expires_at = await service.generate_invite_code(current_user.id)
        return {"invite_code": code, "expires_at": expires_at}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/link")
async def link_student(
    code: str = None,
    student_id: int = None,
    parent_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)

    if code:
        # Link via invite code (parent)
        try:
            link = await service.link_by_code(current_user.id, code)
            return {"success": True, "link_id": link.id}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    elif student_id is not None and parent_id is not None:
        # Admin linking
        try:
            link = await service.admin_link_student(parent_id, student_id)
            return {"success": True, "link_id": link.id}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        raise HTTPException(status_code=400, detail="Either invite_code or (student_id + parent_id) required")


@router.get("/students")
async def get_linked_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)
    return await service.get_linked_students(current_user.id)


@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)
    students = await service.get_linked_students(current_user.id)
    return {"students": students}


@router.get("/dashboard/analysis/{student_id}")
async def get_student_analysis(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)
    return await service.get_student_analysis(student_id)


@router.get("/notifications")
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Get notifications for a parent (when a child completes a session or earns achievement).
    """
    service = NotificationService(db)
    notifications = await service.get_notifications(current_user.id, limit, offset)
    unread_count = await service.get_unread_count(current_user.id)
    return {"notifications": notifications, "unread_count": unread_count}


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    """Mark a notification as read."""
    service = NotificationService(db)
    success = await service.mark_as_read(notification_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


class EmailPreferenceRequest(BaseModel):
    weekly_summary: bool = True
    achievement_alerts: bool = True
    enabled: bool = True


@router.get("/email-preferences")
async def get_email_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    """Get parent's email notification preferences."""
    from app.models.email_preference import EmailPreference
    result = await db.execute(
        select(EmailPreference).where(EmailPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        return {"weekly_summary": True, "achievement_alerts": True, "enabled": True}
    return {
        "weekly_summary": bool(pref.weekly_summary),
        "achievement_alerts": bool(pref.achievement_alerts),
        "enabled": bool(pref.enabled),
    }


@router.put("/email-preferences")
async def update_email_preferences(
    prefs: EmailPreferenceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    """Update parent's email notification preferences."""
    from app.models.email_preference import EmailPreference
    result = await db.execute(
        select(EmailPreference).where(EmailPreference.user_id == current_user.id)
    )
    pref = result.scalar_one_or_none()
    if not pref:
        pref = EmailPreference(user_id=current_user.id)
        db.add(pref)
    pref.weekly_summary = prefs.weekly_summary
    pref.achievement_alerts = prefs.achievement_alerts
    pref.enabled = prefs.enabled
    await db.commit()
    return {"success": True}


@router.get("/weekly-summary/{student_id}")
async def get_weekly_summary(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    """
    Generate a weekly summary for a student's practice.
    Returns a formatted summary of the week's activity.
    """
    from app.services.parent_service import ParentService
    service = ParentService(db)
    # Get last 7 days of trends
    trends = await service.get_student_trends(student_id, days=7)
    analysis = await service.get_student_analysis(student_id)

    # Build summary text
    if not trends.get("trends"):
        return {
            "summary": "本週沒有練習記錄 📭",
            "details": {},
        }

    days = trends.get("trends", [])
    total_problems = sum(d.get("problems", 0) for d in days)
    total_correct = sum(d.get("correct", 0) for d in days)
    accuracy = round(total_correct / total_problems * 100, 1) if total_problems > 0 else 0
    stars = "⭐" * min(3, round(accuracy / 33.3))

    summary_lines = [
        f"📊 本週 {student_id} 練習摘要",
        f"總答題: {total_problems} 題",
        f"正確率: {accuracy}% {stars}",
    ]

    # Best day
    best_day = max(days, key=lambda d: d.get("accuracy", 0), default=None)
    if best_day:
        summary_lines.append(f"最佳表現: {best_day.get('date', 'N/A')} ({best_day.get('accuracy', 0)}%)")

    # Weaknesses
    weaknesses = analysis.get("weaknesses", [])[:3]
    if weaknesses:
        summary_lines.append("需要加強的題型:")
        for w in weaknesses:
            summary_lines.append(f"  • {w.get('question', 'N/A')} (錯{w.get('wrong_count', 0)}次)")

    return {
        "summary": "\n".join(summary_lines),
        "details": {
            "total_problems": total_problems,
            "total_correct": total_correct,
            "accuracy": accuracy,
            "days_practiced": len([d for d in days if d.get('problems', 0) > 0]),
            "best_day": best_day,
            "weaknesses": weaknesses,
        },
    }


@router.get("/dashboard/trends/{student_id}")
async def get_student_trends(
    student_id: int,
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)
    return await service.get_student_trends(student_id, days)
