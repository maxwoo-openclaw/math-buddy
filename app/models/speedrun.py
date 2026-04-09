from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SpeedRunResult(Base):
    __tablename__ = "speed_run_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    time_limit_seconds = Column(Integer, nullable=False)  # 60 | 120
    score = Column(Integer, default=0)  # problems solved
    total_problems = Column(Integer, default=0)
    accuracy = Column(Integer, default=0)  # percentage 0-100
    time_taken_seconds = Column(Integer, nullable=True)
    completed_at = Column(DateTime, server_default=func.now())

    user = relationship("User")


class SkillLevel(Base):
    __tablename__ = "skill_levels"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    operation = Column(String, nullable=False)  # 'addition' | 'subtraction' | 'multiplication' | 'division'
    level = Column(Integer, default=1)  # 1-10
    xp = Column(Integer, default=0)  # current XP towards next level
    total_xp = Column(Integer, default=0)  # lifetime XP earned

    user = relationship("User")

    __table_args__ = (
        # Unique per user per operation
    )