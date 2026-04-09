# Achievement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add achievement system with 13 badges checked after each session

**Architecture:** Achievement models, AchievementService with check logic, API endpoints, frontend badge grid with toast notifications

**Tech Stack:** FastAPI + SQLAlchemy (backend), React (frontend)

---

## File Map

**Backend - Create:**
- `app/models/achievement.py` — Achievement and UserAchievement models
- `app/services/achievement_service.py` — Achievement checking and awarding logic
- `app/routers/achievements.py` — API endpoints
- `tests/test_achievements.py` — Unit tests

**Backend - Modify:**
- `app/models/models.py` — Add `achievements` relationship to User model
- `app/services/practice_service.py` — Call achievement check after session completes

**Frontend - Create:**
- `frontend/src/components/achievements/AchievementBadge.tsx` — Individual badge component
- `frontend/src/components/achievements/AchievementToast.tsx` — Toast notification component

**Frontend - Modify:**
- `frontend/src/pages/Dashboard.tsx` — Add achievement panel
- `frontend/src/services/api.ts` — Add achievements API calls

---

## Task 1: Database Models

**Files:**
- Create: `app/models/achievement.py`
- Modify: `app/models/models.py` (add relationship to User)

- [ ] **Step 1: Create achievement models**

```python
# app/models/achievement.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)  # 'consistency' | 'operation' | 'milestone'

    users = relationship("UserAchievement", back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    achievement_key = Column(String, ForeignKey("achievements.key"), nullable=False)
    earned_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="users")
```

- [ ] **Step 2: Update User model relationship**

```python
# In app/models/models.py, add to User class:
achievements = relationship("UserAchievement", back_populates="user")
```

- [ ] **Step 3: Verify models load**

```bash
cd /home/reeve/math-buddy && python -c "from app.models.achievement import Achievement, UserAchievement; print('Models OK')"
```

- [ ] **Step 4: Run tests**

```bash
cd /home/reeve/math-buddy && python -m pytest tests/test_auth.py -v 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add app/models/achievement.py app/models/models.py && git commit -m "feat: Add Achievement and UserAchievement models"
```

---

## Task 2: Achievement Service

**Files:**
- Create: `app/services/achievement_service.py`

- [ ] **Step 1: Write achievement definitions and service**

```python
# app/services/achievement_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from typing import Optional
import math

from app.models.achievement import Achievement, UserAchievement
from app.models.models import User, PracticeSession, SessionAnswer, MathProblem

# Achievement definitions
ACHIEVEMENTS = [
    # Consistency
    {"key": "beginner", "name": "初學者", "icon": "🌟", "description": "Complete your first session", "category": "consistency"},
    {"key": "week_streak", "name": "坚持不懈", "icon": "🔥", "description": "Practice 7 consecutive days", "category": "consistency"},
    {"key": "dedicated", "name": "勤奋好学", "icon": "💪", "description": "Complete 50 sessions", "category": "consistency"},
    # Operation mastery
    {"key": "add_master", "name": "加法高手", "icon": "🧮", "description": "Addition accuracy ≥ 90% (30+ problems)", "category": "operation"},
    {"key": "sub_master", "name": "减法达人", "icon": "➖", "description": "Subtraction accuracy ≥ 90% (30+ problems)", "category": "operation"},
    {"key": "mul_master", "name": "乘法专家", "icon": "✖️", "description": "Multiplication accuracy ≥ 90% (30+ problems)", "category": "operation"},
    {"key": "div_master", "name": "除法大师", "icon": "➗", "description": "Division accuracy ≥ 90% (30+ problems)", "category": "operation"},
    # Milestones
    {"key": "perfect_session", "name": "百发百中", "icon": "🎯", "description": "100% accuracy in a session (5+ problems)", "category": "milestone"},
    {"key": "century", "name": "知识渊博", "icon": "📚", "description": "Solve 100 problems total", "category": "milestone"},
    {"key": "scholar", "name": "学富五车", "icon": "📖", "description": "Solve 500 problems total", "category": "milestone"},
    {"key": "polymath", "name": "博学多才", "icon": "🧠", "description": "Solve 1000 problems total", "category": "milestone"},
    {"key": "star_collector", "name": "星级玩家", "icon": "⭐", "description": "Earn 100 stars total", "category": "milestone"},
]


class AchievementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ensure_seed_data(self):
        """Ensure all achievements exist in DB"""
        for ach in ACHIEVEMENTS:
            result = await self.db.execute(
                select(Achievement).where(Achievement.key == ach["key"])
            )
            if not result.scalar_one_or_none():
                achievement = Achievement(**ach)
                self.db.add(achievement)
        await self.db.commit()

    async def get_user_achievements(self, user_id: int) -> dict:
        """Get all achievements with earned status for a user"""
        await self.ensure_seed_data()
        
        # Get all achievements
        result = await self.db.execute(select(Achievement))
        all_achievements = result.scalars().all()
        
        # Get user's earned achievements
        earned_result = await self.db.execute(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
        )
        earned = {ua.achievement_key: ua for ua in earned_result.scalars().all()}
        
        achievements = []
        for ach in all_achievements:
            achievements.append({
                "key": ach.key,
                "name": ach.name,
                "icon": ach.icon,
                "description": ach.description,
                "category": ach.category,
                "earned": ach.key in earned,
                "earned_at": earned[ach.key].earned_at.isoformat() if ach.key in earned else None
            })
        
        return {
            "achievements": achievements,
            "earned_count": len(earned),
            "total_count": len(all_achievements)
        }

    async def check_and_award(self, user_id: int, session_id: int = None) -> list[dict]:
        """Check achievements and award any newly unlocked ones. Returns newly awarded."""
        await self.ensure_seed_data()
        
        # Get user's existing achievements
        earned_result = await self.db.execute(
            select(UserAchievement.achievement_key).where(UserAchievement.user_id == user_id)
        )
        already_earned = {row[0] for row in earned_result.all()}
        
        # Calculate stats
        stats = await self._calculate_user_stats(user_id)
        
        new_achievements = []
        
        # Check each achievement
        for ach in ACHIEVEMENTS:
            key = ach["key"]
            if key in already_earned:
                continue
            
            if self._check_achievement(key, stats, session_id):
                ua = UserAchievement(
                    user_id=user_id,
                    achievement_key=key
                )
                self.db.add(ua)
                new_achievements.append(ach)
        
        if new_achievements:
            await self.db.commit()
        
        return new_achievements

    def _check_achievement(self, key: str, stats: dict, session_id: int = None) -> bool:
        """Check if an achievement should be awarded based on stats"""
        if key == "beginner":
            return stats["total_sessions"] >= 1
        elif key == "week_streak":
            return stats["streak_days"] >= 7
        elif key == "dedicated":
            return stats["total_sessions"] >= 50
        elif key == "add_master":
            return stats["ops"]["addition"]["attempts"] >= 30 and stats["ops"]["addition"]["accuracy"] >= 90
        elif key == "sub_master":
            return stats["ops"]["subtraction"]["attempts"] >= 30 and stats["ops"]["subtraction"]["accuracy"] >= 90
        elif key == "mul_master":
            return stats["ops"]["multiplication"]["attempts"] >= 30 and stats["ops"]["multiplication"]["accuracy"] >= 90
        elif key == "div_master":
            return stats["ops"]["division"]["attempts"] >= 30 and stats["ops"]["division"]["accuracy"] >= 90
        elif key == "perfect_session":
            return stats["has_perfect_session"]
        elif key == "century":
            return stats["total_problems"] >= 100
        elif key == "scholar":
            return stats["total_problems"] >= 500
        elif key == "polymath":
            return stats["total_problems"] >= 1000
        elif key == "star_collector":
            return stats["total_stars"] >= 100
        return False

    async def _calculate_user_stats(self, user_id: int) -> dict:
        """Calculate all stats needed for achievement checking"""
        # Get all sessions
        sessions_result = await self.db.execute(
            select(PracticeSession).where(PracticeSession.user_id == user_id)
        )
        sessions = sessions_result.scalars().all()
        
        total_sessions = len(sessions)
        total_problems = sum(s.total_problems for s in sessions)
        correct_problems = sum(s.correct_count for s in sessions)
        total_stars = sum(s.correct_count for s in sessions)  # 1 star per correct for now
        
        # Calculate streak
        streak_days = await self._calculate_streak(user_id)
        
        # Check for perfect session
        has_perfect_session = any(
            s.total_problems >= 5 and s.correct_count == s.total_problems
            for s in sessions
        )
        
        # Calculate per-operation stats
        ops = {"addition": {"attempts": 0, "correct": 0},
               "subtraction": {"attempts": 0, "correct": 0},
               "multiplication": {"attempts": 0, "correct": 0},
               "division": {"attempts": 0, "correct": 0}}
        
        for session in sessions:
            answers_result = await self.db.execute(
                select(SessionAnswer).where(SessionAnswer.session_id == session.id)
            )
            answers = answers_result.scalars().all()
            
            for answer in answers:
                problem_result = await self.db.execute(
                    select(MathProblem).where(MathProblem.id == answer.problem_id)
                )
                problem = problem_result.scalar_one_or_none()
                if problem:
                    op = problem.operation_type
                    if op in ops:
                        ops[op]["attempts"] += 1
                        if answer.is_correct:
                            ops[op]["correct"] += 1
        
        # Calculate accuracy per operation
        for op in ops:
            if ops[op]["attempts"] > 0:
                ops[op]["accuracy"] = round(ops[op]["correct"] / ops[op]["attempts"] * 100, 1)
            else:
                ops[op]["accuracy"] = 0
        
        return {
            "total_sessions": total_sessions,
            "total_problems": total_problems,
            "total_stars": total_stars,
            "streak_days": streak_days,
            "has_perfect_session": has_perfect_session,
            "ops": ops
        }

    async def _calculate_streak(self, user_id: int) -> int:
        """Calculate consecutive days with at least one session"""
        today = datetime.now(timezone.utc).date()
        sessions_result = await self.db.execute(
            select(PracticeSession).where(PracticeSession.user_id == user_id)
        )
        sessions = sessions_result.scalars().all()
        
        # Get unique practice dates
        practice_dates = set()
        for s in sessions:
            if s.started_at:
                practice_dates.add(s.started_at.date())
        
        if not practice_dates:
            return 0
        
        # Sort dates descending
        sorted_dates = sorted(practice_dates, reverse=True)
        
        # Check consecutive days from today
        streak = 0
        expected_date = today
        
        for d in sorted_dates:
            if d == expected_date or d == expected_date - timedelta(days=1):
                streak += 1
                expected_date = d - timedelta(days=1)
            else:
                break
        
        return streak
```

- [ ] **Step 2: Verify service loads**

```bash
cd /home/reeve/math-buddy && python -c "from app.services.achievement_service import AchievementService; print('Service OK')"
```

- [ ] **Step 3: Commit**

```bash
git add app/services/achievement_service.py && git commit -m "feat: Add AchievementService with check and award logic"
```

---

## Task 3: Achievement Router

**Files:**
- Create: `app/routers/achievements.py`
- Modify: `main.py` (add router)

- [ ] **Step 1: Create achievement router**

```python
# app/routers/achievements.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import User
from app.services.achievement_service import AchievementService
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/achievements", tags=["achievements"])


@router.get("/")
async def get_achievements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AchievementService(db)
    return await service.get_user_achievements(current_user.id)


@router.post("/check")
async def check_achievements(
    session_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AchievementService(db)
    new_achievements = await service.check_and_award(current_user.id, session_id)
    return {"new_achievements": new_achievements}


@router.get("/parent/{student_id}")
async def get_student_achievements(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Parents and admins can view
    if current_user.role not in ("parent", "admin"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = AchievementService(db)
    return await service.get_user_achievements(student_id)
```

- [ ] **Step 2: Add router to main.py**

```python
# In main.py:
from app.routers import auth, users, problems, practice, parents, achievements

app.include_router(achievements.router)
```

- [ ] **Step 3: Verify endpoints**

```bash
cd /home/reeve/math-buddy && python -c "from main import app; print([r.path for r in app.routes if 'achievement' in r.path])"
```

- [ ] **Step 4: Commit**

```bash
git add app/routers/achievements.py main.py && git commit -m "feat: Add achievement API endpoints"
```

---

## Task 4: Integrate Achievement Check into Session Completion

**Files:**
- Modify: `app/services/practice_service.py` (call achievement check after session completes)

- [ ] **Step 1: Import and call achievement service in complete_session**

```python
# In app/services/practice_service.py, add at end of complete_session method:
from app.services.achievement_service import AchievementService

# After:
#     session.completed_at = datetime.now(timezone.utc)
#     await self.db.commit()
# Add:
achievement_service = AchievementService(self.db)
await achievement_service.check_and_award(user_id, session_id)
```

- [ ] **Step 2: Verify**

```bash
cd /home/reeve/math-buddy && python -c "from app.services.practice_service import PracticeService; print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add app/services/practice_service.py && git commit -m "feat: Check achievements after session completion"
```

---

## Task 5: Frontend - Types and API

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Add achievement types**

```typescript
// In frontend/src/types/index.ts

export interface Achievement {
  key: string;
  name: string;
  icon: string;
  description: string;
  category: 'consistency' | 'operation' | 'milestone';
  earned: boolean;
  earned_at: string | null;
}

export interface AchievementsResponse {
  achievements: Achievement[];
  earned_count: number;
  total_count: number;
}

export interface NewAchievement {
  key: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}
```

- [ ] **Step 2: Add API calls**

```typescript
// In frontend/src/services/api.ts, add:

export const achievementsApi = {
  getAchievements: async (): Promise<AchievementsResponse> => {
    const res = await api.get('/api/achievements/');
    return res.data;
  },
  
  checkAchievements: async (sessionId?: number): Promise<{ new_achievements: NewAchievement[] }> => {
    const res = await api.post('/api/achievements/check', null, { params: sessionId ? { session_id: sessionId } : {} });
    return res.data;
  },
  
  getStudentAchievements: async (studentId: number): Promise<AchievementsResponse> => {
    const res = await api.get(`/api/achievements/parent/${studentId}`);
    return res.data;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/api.ts && git commit -m "feat: Add achievement types and API client"
```

---

## Task 6: Frontend - Achievement Components

**Files:**
- Create: `frontend/src/components/achievements/AchievementBadge.tsx`
- Create: `frontend/src/components/achievements/AchievementToast.tsx`

- [ ] **Step 1: AchievementBadge component**

```tsx
// frontend/src/components/achievements/AchievementBadge.tsx
import type { Achievement } from '../../types';

interface Props {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
}

export default function AchievementBadge({ achievement, size = 'md' }: Props) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl'
  };
  
  const borderColors = {
    consistency: 'border-yellow-400',
    operation: 'border-blue-400',
    milestone: 'border-purple-400'
  };
  
  return (
    <div 
      className={`
        ${sizeClasses[size]}
        rounded-full border-4 flex items-center justify-center
        ${achievement.earned 
          ? `${borderColors[achievement.category]} bg-white shadow-lg` 
          : 'border-gray-300 bg-gray-100 opacity-50'}
      `}
      title={achievement.earned ? `${achievement.name}: ${achievement.description}` : '???'}
    >
      {achievement.earned ? achievement.icon : '?'}
    </div>
  );
}
```

- [ ] **Step 2: AchievementToast component**

```tsx
// frontend/src/components/achievements/AchievementToast.tsx
import { useEffect, useState } from 'react';
import type { NewAchievement } from '../../types';

interface Props {
  achievement: NewAchievement | null;
  onClose: () => void;
}

export default function AchievementToast({ achievement, onClose }: Props) {
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);
  
  if (!achievement) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-slide-up z-50">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{achievement.icon}</span>
        <div>
          <p className="font-bold text-lg">🎉 新成就解锁！</p>
          <p className="font-semibold">{achievement.name}</p>
          <p className="text-sm opacity-80">{achievement.description}</p>
        </div>
        <button onClick={onClose} className="ml-4 text-white/80 hover:text-white text-xl">×</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/achievements/AchievementBadge.tsx frontend/src/components/achievements/AchievementToast.tsx && git commit -m "feat: Add achievement badge and toast components"
```

---

## Task 7: Frontend - Dashboard Integration

**Files:**
- Modify: `frontend/src/pages/Dashboard.tsx` (add achievement panel)

- [ ] **Step 1: Add achievement section to Dashboard**

```tsx
// In Dashboard.tsx, add state and useEffect:

const [achievements, setAchievements] = useState<AchievementsResponse | null>(null);
const [newAchievement, setNewAchievement] = useState<NewAchievement | null>(null);

useEffect(() => {
  loadAchievements();
}, []);

const loadAchievements = async () => {
  try {
    const data = await achievementsApi.getAchievements();
    setAchievements(data);
  } catch (err) {
    console.error('Failed to load achievements', err);
  }
};

// After session completes, check for new achievements:
const checkNewAchievements = async (sessionId: number) => {
  try {
    const result = await achievementsApi.checkAchievements(sessionId);
    if (result.new_achievements?.length > 0) {
      setNewAchievement(result.new_achievements[0]);
      loadAchievements(); // Refresh
    }
  } catch (err) {
    console.error('Failed to check achievements', err);
  }
};

// Add to render, in the dashboard content:
<div className="mt-8">
  <h2 className="text-xl font-bold mb-4">🏆 成就</h2>
  <div className="bg-white rounded-xl shadow p-4">
    <p className="text-sm text-gray-500 mb-4">
      {achievements?.earned_count || 0} / {achievements?.total_count || 0} 已解锁
    </p>
    <div className="flex flex-wrap gap-3">
      {achievements?.achievements.map(ach => (
        <AchievementBadge key={ach.key} achievement={ach} />
      ))}
    </div>
  </div>
</div>

{/* Add toast */}
<AchievementToast 
  achievement={newAchievement} 
  onClose={() => setNewAchievement(null)} 
/>
```

- [ ] **Step 2: Add imports**

```tsx
import AchievementBadge from '../components/achievements/AchievementBadge';
import AchievementToast from '../components/achievements/AchievementToast';
import { achievementsApi } from '../services/api';
import type { AchievementsResponse, NewAchievement } from '../types';
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx && git commit -m "feat: Add achievement panel to dashboard"
```

---

## Task 8: Tests

**Files:**
- Create: `tests/test_achievements.py`

- [ ] **Step 1: Write achievement tests**

```python
# tests/test_achievements.py
import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_get_achievements_requires_auth():
    async with AsyncClient(app=app, base_url="http://test") as client:
        resp = await client.get("/api/achievements/")
        assert resp.status_code == 401

@pytest.mark.asyncio
async def test_get_achievements():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Register and login
        await client.post("/api/auth/register", json={"username": "achuser", "email": "ach@test.com", "password": "test123"})
        login = await client.post("/api/auth/login", data={"username": "achuser", "password": "test123"})
        token = login.json()["access_token"]
        
        resp = await client.get("/api/achievements/", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "achievements" in data
        assert "earned_count" in data
        assert "total_count" in data
        assert data["total_count"] == 12  # All achievements defined

@pytest.mark.asyncio
async def test_achievement_check():
    async with AsyncClient(app=app, base_url="http://test") as client:
        login = await client.post("/api/auth/login", data={"username": "achuser", "password": "test123"})
        token = login.json()["access_token"]
        
        resp = await client.post("/api/achievements/check", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert "new_achievements" in resp.json()
```

- [ ] **Step 2: Run tests**

```bash
cd /home/reeve/math-buddy && python -m pytest tests/test_achievements.py -v
```

- [ ] **Step 3: Commit**

```bash
git add tests/test_achievements.py && git commit -m "test: Add achievement system tests"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd /home/reeve/math-buddy && python -m pytest tests/ -v 2>&1 | tail -20
```

- [ ] **Step 2: Push all changes**

```bash
git push origin main
```

- [ ] **Step 3: Verify acceptance criteria**

Review spec and confirm all criteria met.

---

## Spec Coverage Check

- [x] Achievements table seeded with all 12 achievements — Task 2 (ensure_seed_data)
- [x] UserAchievements table tracks earned achievements — Task 1
- [x] check_and_award correctly identifies newly unlocked — Task 2
- [x] GET /api/achievements returns all achievements with earned status — Task 3
- [x] Student sees visual badge grid on frontend — Task 7
- [x] Toast notification appears when achievement unlocks — Task 7
- [x] Parent can see child's achievements — Task 3 (/parent/{student_id})
- [x] Each achievement awarded only once per user (idempotent) — Task 2 (already_earned check)
