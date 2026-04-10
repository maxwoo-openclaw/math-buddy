from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ParentNotification(Base):
    """Notifications sent to parents when their child completes a practice session"""
    __tablename__ = "parent_notifications"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("practice_sessions.id"), nullable=True)
    notification_type = Column(String, nullable=False)  # 'session_complete', 'achievement_earned', 'streak_milestone'
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Integer, default=0)  # 0=unread, 1=read
    created_at = Column(DateTime, server_default=func.now())

    parent = relationship("User", foreign_keys=[parent_id])
    student = relationship("User", foreign_keys=[student_id])