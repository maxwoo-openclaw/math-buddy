# Parent Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add parent dashboard feature - enable parents to monitor linked students' math practice progress

**Architecture:** Add parent role and ParentStudentLink table, new API endpoints, and frontend dashboard page with charts

**Tech Stack:** FastAPI + SQLAlchemy (backend), React + Recharts (frontend)

---

## File Map

**Backend - Create:**
- `app/routers/parents.py` — New router for parent endpoints
- `app/services/parent_service.py` — Business logic for parent operations
- `tests/test_parents.py` — Unit tests for parent endpoints

**Backend - Modify:**
- `app/models/models.py` — Add `ParentStudentLink` model, add `invite_code`/`invite_expires_at` to User, add `parent` to role enum
- `app/schemas/user.py` — Add invite code fields to User schema
- `app/routers/auth.py` — Add endpoint to generate invite code

**Frontend - Create:**
- `frontend/src/pages/ParentDashboard.tsx` — Parent dashboard page
- `frontend/src/services/parentApi.ts` — API client for parent endpoints

**Frontend - Modify:**
- `frontend/src/App.tsx` — Add route for /parent
- `frontend/src/types/index.ts` — Add TypeScript types

---

## Task 1: Database Models

**Files:**
- Modify: `app/models/models.py`
- Test: `python -c "from app.models.models import User, ParentStudentLink; print('OK')"`

- [ ] **Step 1: Update User model - add parent role and invite fields**

```python
# In class User, change role field:
role = Column(String, default="student")  # 'student' | 'admin' | 'parent'

# Add new columns:
invite_code = Column(String, unique=True, nullable=True, index=True)
invite_expires_at = Column(DateTime, nullable=True)

# Add relationship:
parent_links = relationship("ParentStudentLink", foreign_keys="ParentStudentLink.parent_id")
```

- [ ] **Step 2: Create ParentStudentLink model**

```python
class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    linked_at = Column(DateTime, server_default=func.now())
    linked_by = Column(String)  # 'admin' | 'self'

    parent = relationship("User", foreign_keys=[parent_id])
    student = relationship("User", foreign_keys=[student_id])
```

- [ ] **Step 3: Verify models load**

```bash
cd /home/reeve/math-buddy && python -c "from app.models.models import User, ParentStudentLink; print('Models OK')"
```

- [ ] **Step 4: Run tests to ensure no breakage**

```bash
cd /home/reeve/math-buddy && python -m pytest tests/test_auth.py -v 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add app/models/models.py && git commit -m "feat: Add ParentStudentLink model and user invite fields"
```

---

## Task 2: Backend Schemas

**Files:**
- Modify: `app/schemas/user.py`

- [ ] **Step 1: Add parent-related schemas**

```python
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
```

- [ ] **Step 2: Update UserResponse to include invite fields**

```python
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    invite_code: Optional[str] = None
    invite_expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

- [ ] **Step 3: Verify schemas load**

```bash
cd /home/reeve/math-buddy && python -c "from app.schemas.user import UserResponse, StudentLinkResponse, GenerateCodeResponse; print('Schemas OK')"
```

- [ ] **Step 4: Commit**

```bash
git add app/schemas/user.py && git commit -m "feat: Add parent dashboard schemas"
```

---

## Task 3: Parent Service

**Files:**
- Create: `app/services/parent_service.py`
- Test: `python -c "from app.services.parent_service import ParentService; print('OK')"`

- [ ] **Step 1: Write parent service**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone, timedelta
import secrets

from app.models import User, ParentStudentLink, PracticeSession, SessionAnswer, MathProblem

class ParentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_invite_code(self, student_id: int) -> tuple[str, datetime]:
        """Generate 72-hour invite code for student"""
        code = secrets.token_hex(4)  # 8-char code
        expires_at = datetime.now(timezone.utc) + timedelta(hours=72)
        
        result = await self.db.execute(select(User).where(User.id == student_id))
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError("Student not found")
        
        student.invite_code = code
        student.invite_expires_at = expires_at
        await self.db.commit()
        return code, expires_at

    async def link_by_code(self, parent_id: int, code: str) -> ParentStudentLink:
        """Link parent to student via invite code"""
        result = await self.db.execute(
            select(User).where(
                User.invite_code == code,
                User.role == "student"
            ).options(load_with_join)  # simplified
        )
        student = result.scalar_one_or_none()
        if not student:
            raise ValueError("Invalid invite code")
        
        if student.invite_expires_at < datetime.now(timezone.utc):
            raise ValueError("Invite code expired")
        
        # Check if already linked
        existing = await self.db.execute(
            select(ParentStudentLink).where(
                ParentStudentLink.parent_id == parent_id,
                ParentStudentLink.student_id == student.id
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Already linked to this student")
        
        link = ParentStudentLink(
            parent_id=parent_id,
            student_id=student.id,
            linked_by="self"
        )
        student.invite_code = None  # consume code
        student.invite_expires_at = None
        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)
        return link

    async def admin_link_student(self, parent_id: int, student_id: int) -> ParentStudentLink:
        """Admin links parent to student"""
        link = ParentStudentLink(
            parent_id=parent_id,
            student_id=student_id,
            linked_by="admin"
        )
        self.db.add(link)
        await self.db.commit()
        await self.db.refresh(link)
        return link

    async def get_linked_students(self, parent_id: int) -> list[dict]:
        """Get all students linked to a parent with core metrics"""
        result = await self.db.execute(
            select(ParentStudentLink).where(ParentStudentLink.parent_id == parent_id)
        )
        links = result.scalars().all()
        
        students_data = []
        for link in links:
            student = await self.db.get(User, link.student_id)
            
            # Get session stats
            sessions_result = await self.db.execute(
                select(PracticeSession).where(PracticeSession.user_id == student.id)
            )
            sessions = sessions_result.scalars().all()
            
            total_problems = sum(s.total_problems for s in sessions)
            correct_count = sum(s.correct_count for s in sessions)
            accuracy = (correct_count / total_problems * 100) if total_problems > 0 else 0
            
            students_data.append({
                "id": student.id,
                "username": student.username,
                "total_sessions": len(sessions),
                "total_problems": total_problems,
                "overall_accuracy": round(accuracy, 1)
            })
        
        return students_data

    async def get_student_analysis(self, student_id: int) -> dict:
        """Get detailed analysis for a student"""
        # Get all answers with problem details
        result = await self.db.execute(
            select(SessionAnswer).where(SessionAnswer.session_id.in_(
                select(PracticeSession.id).where(PracticeSession.user_id == student_id)
            ))
        )
        answers = result.scalars().all()
        
        # Get problem details
        problem_ids = [a.problem_id for a in answers]
        if problem_ids:
            problems_result = await self.db.execute(
                select(MathProblem).where(MathProblem.id.in_(problem_ids))
            )
            problems = {p.id: p for p in problems_result.scalars().all()}
        else:
            problems = {}
        
        # Aggregate by operation
        ops = {"addition": 0, "subtraction": 0, "multiplication": 0, "division": 0}
        ops_correct = {"addition": 0, "subtraction": 0, "multiplication": 0, "division": 0}
        diffs = {"easy": 0, "medium": 0, "hard": 0}
        diffs_correct = {"easy": 0, "medium": 0, "hard": 0}
        
        for answer in answers:
            problem = problems.get(answer.problem_id)
            if not problem:
                continue
            op = problem.operation_type
            diff = problem.difficulty
            ops[op] = ops.get(op, 0) + 1
            diffs[diff] = diffs.get(diff, 0) + 1
            if answer.is_correct:
                ops_correct[op] = ops_correct.get(op, 0) + 1
                diffs_correct[diff] = diffs_correct.get(diff, 0) + 1
        
        operation_breakdown = {}
        for op in ops:
            attempted = ops[op]
            correct = ops_correct[op]
            operation_breakdown[op] = {
                "attempted": attempted,
                "accuracy": round(correct / attempted * 100, 1) if attempted > 0 else 0
            }
        
        difficulty_breakdown = {}
        for diff in diffs:
            attempted = diffs[diff]
            correct = diffs_correct[diff]
            difficulty_breakdown[diff] = {
                "attempted": attempted,
                "accuracy": round(correct / attempted * 100, 1) if attempted > 0 else 0
            }
        
        # Find weakest/strongest
        with_accuracy = [(k, v["accuracy"]) for k, v in operation_breakdown.items() if v["attempted"] > 0]
        if with_accuracy:
            weakest = min(with_accuracy, key=lambda x: x[1])
            strongest = max(with_accuracy, key=lambda x: x[1])
        else:
            weakest = strongest = (None, 0)
        
        return {
            "student_id": student_id,
            "operation_breakdown": operation_breakdown,
            "difficulty_breakdown": difficulty_breakdown,
            "weakest_operation": weakest[0],
            "strongest_operation": strongest[0]
        }

    async def get_student_trends(self, student_id: int, days: int) -> list[dict]:
        """Get accuracy trend over N days"""
        from datetime import timedelta
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        result = await self.db.execute(
            select(PracticeSession).where(
                PracticeSession.user_id == student_id,
                PracticeSession.started_at >= start_date
            )
        )
        sessions = result.scalars().all()
        
        # Group by date
        daily_data = {}
        for s in sessions:
            date_str = s.started_at.strftime("%Y-%m-%d")
            if date_str not in daily_data:
                daily_data[date_str] = {"total": 0, "correct": 0}
            daily_data[date_str]["total"] += s.total_problems
            daily_data[date_str]["correct"] += s.correct_count
        
        trend = []
        for date_str in sorted(daily_data.keys()):
            d = daily_data[date_str]
            trend.append({
                "date": date_str,
                "accuracy": round(d["correct"] / d["total"] * 100, 1) if d["total"] > 0 else 0,
                "problems": d["total"]
            })
        
        return trend
```

- [ ] **Step 2: Verify service loads**

```bash
cd /home/reeve/math-buddy && python -c "from app.services.parent_service import ParentService; print('Service OK')"
```

- [ ] **Step 3: Commit**

```bash
git add app/services/parent_service.py && git commit -m "feat: Add ParentService with link and analytics methods"
```

---

## Task 4: Parent Router

**Files:**
- Create: `app/routers/parents.py`
- Modify: `app/routers/auth.py` (add invite code endpoint)

- [ ] **Step 1: Create parent router**

```python
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
    current_user: User = Depends(get_parent_user),
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
    elif student_id and parent_id:
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
```

- [ ] **Step 2: Include router in main.py**

```python
# In main.py, add:
from app.routers import auth, users, problems, practice, parents

app.include_router(parents.router)
```

- [ ] **Step 3: Verify endpoints work**

```bash
cd /home/reeve/math-buddy && python -c "from main import app; print([r.path for r in app.routes])" | grep parents
```

- [ ] **Step 4: Commit**

```bash
git add app/routers/parents.py main.py && git commit -m "feat: Add parent dashboard API endpoints"
```

---

## Task 5: Frontend - Types and API Client

**Files:**
- Create: `frontend/src/services/parentApi.ts`
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Add TypeScript types**

```typescript
// In frontend/src/types/index.ts

export interface LinkedStudent {
  id: number;
  username: string;
  total_sessions: number;
  total_problems: number;
  overall_accuracy: number;
}

export interface DashboardResponse {
  students: LinkedStudent[];
}

export interface OperationBreakdown {
  addition: { attempted: number; accuracy: number };
  subtraction: { attempted: number; accuracy: number };
  multiplication: { attempted: number; accuracy: number };
  division: { attempted: number; accuracy: number };
}

export interface DifficultyBreakdown {
  easy: { attempted: number; accuracy: number };
  medium: { attempted: number; accuracy: number };
  hard: { attempted: number; accuracy: number };
}

export interface StudentAnalysis {
  student_id: number;
  operation_breakdown: OperationBreakdown;
  difficulty_breakdown: DifficultyBreakdown;
  weakest_operation: string | null;
  strongest_operation: string | null;
}

export interface TrendPoint {
  date: string;
  accuracy: number;
  problems: number;
}
```

- [ ] **Step 2: Create parent API client**

```typescript
// frontend/src/services/parentApi.ts
import { api } from './api';
import type { DashboardResponse, LinkedStudent, StudentAnalysis, TrendPoint } from '../types';

export const parentApi = {
  getDashboard: async (): Promise<DashboardResponse> => {
    const res = await api.get('/api/parents/dashboard');
    return res.data;
  },

  getLinkedStudents: async (): Promise<LinkedStudent[]> => {
    const res = await api.get('/api/parents/students');
    return res.data;
  },

  generateInviteCode: async (): Promise<{ invite_code: string; expires_at: string }> => {
    const res = await api.post('/api/parents/generate-code');
    return res.data;
  },

  linkByCode: async (code: string): Promise<{ success: boolean }> => {
    const res = await api.post('/api/parents/link', null, { params: { code } });
    return res.data;
  },

  getAnalysis: async (studentId: number): Promise<StudentAnalysis> => {
    const res = await api.get(`/api/parents/dashboard/analysis/${studentId}`);
    return res.data;
  },

  getTrends: async (studentId: number, days: number = 7): Promise<TrendPoint[]> => {
    const res = await api.get(`/api/parents/dashboard/trends/${studentId}`, { params: { days } });
    return res.data;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/parentApi.ts && git commit -m "feat: Add parent dashboard types and API client"
```

---

## Task 6: Frontend - Parent Dashboard Page

**Files:**
- Create: `frontend/src/pages/ParentDashboard.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create ParentDashboard page with tabs and charts**

```tsx
// frontend/src/pages/ParentDashboard.tsx
import { useState, useEffect } from 'react';
import { parentApi } from '../services/parentApi';
import type { LinkedStudent, StudentAnalysis, TrendPoint } from '../types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function ParentDashboard() {
  const [students, setStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<StudentAnalysis | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [tab, setTab] = useState<'overview' | 'analysis' | 'trends'>('overview');
  const [trendDays, setTrendDays] = useState(7);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadAnalysis(selectedStudent);
      loadTrends(selectedStudent, trendDays);
    }
  }, [selectedStudent, trendDays]);

  const loadDashboard = async () => {
    try {
      const data = await parentApi.getDashboard();
      setStudents(data.students);
      if (data.students.length > 0 && !selectedStudent) {
        setSelectedStudent(data.students[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async (studentId: number) => {
    try {
      const data = await parentApi.getAnalysis(studentId);
      setAnalysis(data);
    } catch (err) {
      console.error('Failed to load analysis', err);
    }
  };

  const loadTrends = async (studentId: number, days: number) => {
    try {
      const data = await parentApi.getTrends(studentId, days);
      setTrends(data);
    } catch (err) {
      console.error('Failed to load trends', err);
    }
  };

  const generateCode = async () => {
    try {
      const result = await parentApi.generateInviteCode();
      setInviteCode(result.invite_code);
    } catch (err) {
      console.error('Failed to generate code', err);
    }
  };

  const linkByCode = async () => {
    try {
      await parentApi.linkByCode(linkCode);
      setLinkCode('');
      loadDashboard();
    } catch (err) {
      console.error('Failed to link', err);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const currentStudent = students.find(s => s.id === selectedStudent);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Parent Dashboard</h1>

        {/* Student Selector */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            <select
              value={selectedStudent || ''}
              onChange={e => setSelectedStudent(Number(e.target.value))}
              className="border rounded-lg px-4 py-2 flex-1"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.username}</option>
              ))}
            </select>
            <button onClick={generateCode} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              Generate Invite Code
            </button>
            {inviteCode && (
              <div className="bg-green-100 px-4 py-2 rounded-lg">
                Code: <strong>{inviteCode}</strong> (72hr valid)
              </div>
            )}
          </div>
          <div className="flex gap-4 mt-4">
            <input
              type="text"
              placeholder="Enter student invite code"
              value={linkCode}
              onChange={e => setLinkCode(e.target.value)}
              className="border rounded-lg px-4 py-2 flex-1"
            />
            <button onClick={linkByCode} className="bg-green-600 text-white px-4 py-2 rounded-lg">
              Link Student
            </button>
          </div>
        </div>

        {currentStudent && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              {(['overview', 'analysis', 'trends'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-6 py-2 rounded-lg font-medium ${tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">Total Sessions</h3>
                  <p className="text-4xl font-bold text-blue-600">{currentStudent.total_sessions}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">Problems Solved</h3>
                  <p className="text-4xl font-bold text-green-600">{currentStudent.total_problems}</p>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-gray-500 text-sm">Overall Accuracy</h3>
                  <p className="text-4xl font-bold text-purple-600">{currentStudent.overall_accuracy}%</p>
                </div>
              </div>
            )}

            {/* Analysis Tab */}
            {tab === 'analysis' && analysis && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">By Operation</h3>
                  <div className="space-y-3">
                    {Object.entries(analysis.operation_breakdown).map(([op, data]) => (
                      <div key={op}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{op}</span>
                          <span>{data.accuracy}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${data.accuracy}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">By Difficulty</h3>
                  <div className="space-y-3">
                    {Object.entries(analysis.difficulty_breakdown).map(([diff, data]) => (
                      <div key={diff}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{diff}</span>
                          <span>{data.accuracy}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div className="h-2 bg-green-500 rounded-full" style={{ width: `${data.accuracy}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {analysis.weakest_operation && (
                    <p className="mt-4 text-sm text-gray-600">
                      Weakest: <strong>{analysis.weakest_operation}</strong> | 
                      Strongest: <strong>{analysis.strongest_operation}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Trends Tab */}
            {tab === 'trends' && (
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Accuracy Trend</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTrendDays(7)}
                      className={`px-4 py-1 rounded ${trendDays === 7 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >7 Days</button>
                    <button
                      onClick={() => setTrendDays(30)}
                      className={`px-4 py-1 rounded ${trendDays === 30 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >30 Days</button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#4A90D9" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

```tsx
// Add import
import ParentDashboard from './pages/ParentDashboard';

// Add route
<Route path="/parent" element={<ParentDashboard />} />
```

- [ ] **Step 3: Install recharts if needed**

```bash
cd /home/reeve/math-buddy/frontend && npm install recharts
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ParentDashboard.tsx frontend/src/App.tsx && git commit -m "feat: Add parent dashboard page with charts"
```

---

## Task 7: Integration Test

**Files:**
- Create: `tests/test_parents.py`

- [ ] **Step 1: Write integration tests**

```python
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_generate_invite_code():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Register student
        await client.post("/api/auth/register", json={"username": "teststudent", "email": "s@test.com", "password": "test123"})
        login = await client.post("/api/auth/login", data={"username": "teststudent", "password": "test123"})
        token = login.json()["access_token"]
        
        # Generate code
        resp = await client.post("/api/parents/generate-code", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert "invite_code" in resp.json()

@pytest.mark.asyncio
async def test_parent_dashboard_requires_auth():
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.get("/api/parents/dashboard")
        assert resp.status_code == 401
```

- [ ] **Step 2: Run tests**

```bash
cd /home/reeve/math-buddy && python -m pytest tests/test_parents.py -v
```

- [ ] **Step 3: Commit**

```bash
git add tests/test_parents.py && git commit -m "test: Add parent dashboard tests"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd /home/reeve/math-buddy && python -m pytest tests/ -v 2>&1 | tail -20
```

- [ ] **Step 2: Push all changes**

```bash
git push origin main
```

- [ ] **Step 3: Verify acceptance criteria in spec**

Review `docs/superpowers/specs/2026-04-09-parent-dashboard-design.md` and check each item.

---

## Spec Coverage Check

- [x] Parent can register and login — existing auth system
- [x] Admin can link student to parent — Task 4 `/api/parents/link`
- [x] Student can generate 72hr invite code — Task 4 `/api/parents/generate-code`
- [x] Parent can link via invite code — Task 4 `/api/parents/link`
- [x] Parent sees list of linked students — Task 4 `/api/parents/students`
- [x] Parent sees core metrics — Task 4 `/api/parents/dashboard`
- [x] Parent sees operation breakdown — Task 4 `/api/parents/dashboard/analysis`
- [x] Parent sees difficulty breakdown — Task 4 `/api/parents/dashboard/analysis`
- [x] Parent sees 7/30 day trends — Task 4 `/api/parents/dashboard/trends`
- [x] Admin can view all students — Task 4 (admin has parent role access)
