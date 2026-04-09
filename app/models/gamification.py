from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UserStreak(Base):
    __tablename__ = "user_streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    current_streak = Column(Integer, default=0)  # consecutive days practiced
    longest_streak = Column(Integer, default=0)
    last_practice_date = Column(DateTime, nullable=True)
    streak_dates = Column(Text, default="[]")  # JSON list of date strings for calendar

    user = relationship("User", backref="streak")


class DailyChallenge(Base):
    __tablename__ = "daily_challenges"

    id = Column(Integer, primary_key=True, index=True)
    target_date = Column(String, unique=True, nullable=False, index=True)  # e.g. "2026-04-09"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    total_problems = Column(Integer, default=10)
    created_at = Column(DateTime, server_default=func.now())

    attempts = relationship("DailyChallengeAttempt", back_populates="challenge")


class DailyChallengeAttempt(Base):
    __tablename__ = "daily_challenge_attempts"

    id = Column(Integer, primary_key=True, index=True)
    challenge_id = Column(Integer, ForeignKey("daily_challenges.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    score = Column(Integer, default=0)
    total_problems = Column(Integer, default=0)
    time_taken_seconds = Column(Integer, nullable=True)
    completed_at = Column(DateTime, server_default=func.now())

    challenge = relationship("DailyChallenge", back_populates="attempts")
    user = relationship("User")