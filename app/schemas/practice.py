from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SessionCreate(BaseModel):
    operation_filter: Optional[str] = None  # 'addition', 'subtraction', 'multiplication', 'division' or None for all
    difficulty_filter: Optional[str] = None  # 'easy', 'medium', 'hard' or None for all


class AnswerSubmit(BaseModel):
    problem_id: int
    user_answer: int


class AnswerResponse(BaseModel):
    problem_id: int
    user_answer: int
    correct_answer: int
    is_correct: bool


class SessionStatsResponse(BaseModel):
    session_id: int
    total_problems: int
    correct_count: int
    accuracy: float
    started_at: datetime
    completed_at: Optional[datetime] = None
    answers: list[AnswerResponse]