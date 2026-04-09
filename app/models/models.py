from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="student")  # 'student' | 'admin' | 'parent'
    invite_code = Column(String, unique=True, nullable=True, index=True)
    invite_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    problems = relationship("MathProblem", back_populates="creator")
    sessions = relationship("PracticeSession", back_populates="user")
    achievements = relationship("UserAchievement", back_populates="user")
    parent_links = relationship("ParentStudentLink", foreign_keys="ParentStudentLink.parent_id")


class MathProblem(Base):
    __tablename__ = "math_problems"

    id = Column(Integer, primary_key=True, index=True)
    operation_type = Column(String, index=True)  # 'addition', 'subtraction', 'multiplication', 'division'
    difficulty = Column(String, index=True)  # 'easy', 'medium', 'hard'
    question = Column(String, nullable=False)
    answer = Column(Integer, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())

    creator = relationship("User", back_populates="problems")
    answers = relationship("SessionAnswer", back_populates="problem")


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    operation_filter = Column(String, nullable=True)  # null = all operations
    difficulty_filter = Column(String, nullable=True)  # null = all difficulties
    total_problems = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
    answers = relationship("SessionAnswer", back_populates="session")


class SessionAnswer(Base):
    __tablename__ = "session_answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("practice_sessions.id"), index=True)
    problem_id = Column(Integer, ForeignKey("math_problems.id"), index=True)
    user_answer = Column(Integer)
    is_correct = Column(Integer)  # 0 or 1 (SQLite doesn't have bool)
    answered_at = Column(DateTime, server_default=func.now())

    session = relationship("PracticeSession", back_populates="answers")
    problem = relationship("MathProblem", back_populates="answers")


class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    linked_at = Column(DateTime, server_default=func.now())
    linked_by = Column(String)  # 'admin' | 'self'

    parent = relationship("User", foreign_keys=[parent_id], overlaps="parent_links")
    student = relationship("User", foreign_keys=[student_id])