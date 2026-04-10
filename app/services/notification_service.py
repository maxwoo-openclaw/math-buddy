from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models import ParentNotification, ParentStudentLink, User, PracticeSession


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_parent_user(self, student_id: int) -> User | None:
        """Get the parent of a student (first linked parent)"""
        result = await self.db.execute(
            select(ParentStudentLink).where(ParentStudentLink.student_id == student_id)
        )
        link = result.scalar_one_or_none()
        if not link:
            return None
        result = await self.db.execute(
            select(User).where(User.id == link.parent_id)
        )
        return result.scalar_one_or_none()

    async def notify_session_complete(
        self,
        student_id: int,
        session_id: int,
        total_problems: int,
        correct_count: int,
    ) -> ParentNotification | None:
        """Send a notification to the parent when a practice session completes."""
        parent = await self._get_parent_user(student_id)
        if not parent:
            return None

        accuracy = round(correct_count / total_problems * 100, 1) if total_problems > 0 else 0
        stars = "⭐" * min(3, round(accuracy / 33.3))

        notification = ParentNotification(
            parent_id=parent.id,
            student_id=student_id,
            session_id=session_id,
            notification_type="session_complete",
            title=f"✅ {parent.username or '子女'} 完成練習",
            body=(
                f"完成 {total_problems} 題，正確率 {accuracy}%，獲得 {stars}\n"
                f"家長可登入 MathBuddy 查看詳細分析。"
            ),
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def notify_achievement_earned(
        self,
        student_id: int,
        achievement_name: str,
        achievement_icon: str,
    ) -> ParentNotification | None:
        """Notify parent when child earns a new achievement."""
        parent = await self._get_parent_user(student_id)
        if not parent:
            return None

        notification = ParentNotification(
            parent_id=parent.id,
            student_id=student_id,
            notification_type="achievement_earned",
            title=f"🏆 子女獲得新成就！",
            body=f"{achievement_icon} {achievement_name}\n繼續鼓勵佢哋練習！",
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def get_notifications(self, parent_id: int, limit: int = 20, offset: int = 0) -> list[dict]:
        """Get notifications for a parent, newest first."""
        result = await self.db.execute(
            select(ParentNotification)
            .where(ParentNotification.parent_id == parent_id)
            .order_by(ParentNotification.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        notifications = result.scalars().all()
        return [
            {
                "id": n.id,
                "type": n.notification_type,
                "title": n.title,
                "body": n.body,
                "is_read": bool(n.is_read),
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in notifications
        ]

    async def get_unread_count(self, parent_id: int) -> int:
        """Get count of unread notifications for a parent."""
        result = await self.db.execute(
            select(ParentNotification).where(
                and_(
                    ParentNotification.parent_id == parent_id,
                    ParentNotification.is_read == 0,
                )
            )
        )
        return len(list(result.scalars().all()))

    async def mark_as_read(self, notification_id: int, parent_id: int) -> bool:
        """Mark a notification as read. Only the parent can mark their own notifications."""
        result = await self.db.execute(
            select(ParentNotification).where(
                and_(
                    ParentNotification.id == notification_id,
                    ParentNotification.parent_id == parent_id,
                )
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            return False
        notification.is_read = 1
        await self.db.commit()
        return True