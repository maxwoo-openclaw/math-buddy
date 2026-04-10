from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base


class EmailPreference(Base):
    """Email notification preferences for parents"""
    __tablename__ = "email_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)
    weekly_summary = Column(Boolean, default=True)  # Weekly progress email
    achievement_alerts = Column(Boolean, default=True)  # Notify when child earns achievement
    enabled = Column(Boolean, default=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())