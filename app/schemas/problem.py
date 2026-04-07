from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProblemBase(BaseModel):
    operation_type: str
    difficulty: str
    question: str
    answer: int


class ProblemCreate(ProblemBase):
    pass


class ProblemUpdate(BaseModel):
    operation_type: Optional[str] = None
    difficulty: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[int] = None


class ProblemResponse(ProblemBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True