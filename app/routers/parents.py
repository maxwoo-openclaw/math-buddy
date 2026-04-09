from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from app.services.parent_service import ParentService
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/parents", tags=["parents"])


def get_parent_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("parent", "admin"):
        raise HTTPException(status_code=403, detail="Parent or admin access required")
    return current_user


@router.post("/generate-code")
async def generate_invite_code(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=400, detail="Only students can generate invite codes")

    service = ParentService(db)
    try:
        code, expires_at = await service.generate_invite_code(current_user.id)
        return {"invite_code": code, "expires_at": expires_at}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/link")
async def link_student(
    code: str = None,
    student_id: int = None,
    parent_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)

    if code:
        # Link via invite code (parent)
        try:
            link = await service.link_by_code(current_user.id, code)
            return {"success": True, "link_id": link.id}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    elif student_id is not None and parent_id is not None:
        # Admin linking
        try:
            link = await service.admin_link_student(parent_id, student_id)
            return {"success": True, "link_id": link.id}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        raise HTTPException(status_code=400, detail="Either invite_code or (student_id + parent_id) required")


@router.get("/students")
async def get_linked_students(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)
    return await service.get_linked_students(current_user.id)


@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)
    students = await service.get_linked_students(current_user.id)
    return {"students": students}


@router.get("/dashboard/analysis/{student_id}")
async def get_student_analysis(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)
    return await service.get_student_analysis(student_id)


@router.get("/dashboard/trends/{student_id}")
async def get_student_trends(
    student_id: int,
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_parent_user),
):
    service = ParentService(db)
    return await service.get_student_trends(student_id, days)
