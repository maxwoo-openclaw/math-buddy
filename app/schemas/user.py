from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    username: str
    email: EmailStr


class UserCreate(UserBase):
    password: str
    role: str = "student"


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime
    invite_code: Optional[str] = None
    invite_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class StudentLinkResponse(BaseModel):
    id: int
    student_id: int
    student_username: str
    linked_at: datetime
    linked_by: str

    class Config:
        from_attributes = True


class LinkStudentRequest(BaseModel):
    student_id: int
    parent_id: int  # only for admin


class LinkByCodeRequest(BaseModel):
    invite_code: str


class GenerateCodeResponse(BaseModel):
    invite_code: str
    expires_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
