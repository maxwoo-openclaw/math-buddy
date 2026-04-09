from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class WeaknessReview(Base):
    """A targeted practice problem generated from a student's weakness"""
    __tablename__ = "weakness_reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mistake_pattern_id = Column(Integer, ForeignKey("mistake_patterns.id"), nullable=False)
    question = Column(String, nullable=False)
    correct_answer = Column(Integer, nullable=False)
    is_mastered = Column(Integer, default=0)  # 0=not mastered, 1=mastered
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    mastered_at = Column(DateTime, nullable=True)

    user = relationship("User")
    mistake_pattern = relationship("MistakePattern")