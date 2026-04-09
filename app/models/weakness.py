from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class MistakePattern(Base):
    """Tracks which specific number pairs a student gets wrong repeatedly"""
    __tablename__ = "mistake_patterns"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    operation = Column(String, nullable=False)  # 'addition' | 'subtraction' | 'multiplication' | 'division'
    # For addition/subtraction: operand_a and operand_b
    # For multiplication: operand_a * operand_b (e.g. 7 x 8)
    # For division: divisor (e.g. a ÷ divisor)
    operand_a = Column(Integer, nullable=False)
    operand_b = Column(Integer, nullable=False)
    wrong_count = Column(Integer, default=1)  # how many times wrong
    correct_count = Column(Integer, default=0)
    last_attempted = Column(Integer, default=0)  # timestamp of last attempt
    # JSON: list of {date, user_answer, correct_answer}
    history = Column(String, default="[]")

    user = relationship("User")

    __table_args__ = (
        Index("idx_mistake_user_op", "user_id", "operation"),
    )