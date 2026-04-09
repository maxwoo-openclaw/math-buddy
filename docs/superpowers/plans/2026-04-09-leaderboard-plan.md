# Leaderboard Implementation Plan

## Tasks

### Task 1: Leaderboard Router + Service
- Create `app/services/leaderboard_service.py`
- Create `app/routers/leaderboard.py`
- Update `main.py` to include router

### Task 2: Frontend - Types + API
- Add types to `frontend/src/services/api.ts`
- Add LeaderboardPage component

### Task 3: Dashboard Integration
- Add leaderboard link to Dashboard

### Task 4: Tests + Commit

---

## Step-by-Step

### Task 1

**`app/services/leaderboard_service.py`:**

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from app.models.models import User, PracticeSession

TIERS = [
    {"min": 5001, "name": "数学大师", "icon": "👑"},
    {"min": 2001, "name": "数学高手", "icon": "🥇"},
    {"min": 1001, "name": "学霸", "icon": "🥈"},
    {"min": 501, "name": "学者", "icon": "🏅"},
    {"min": 201, "name": "进学者", "icon": "🎓"},
    {"min": 51, "name": "学习者", "icon": "📚"},
    {"min": 1, "name": "小学徒", "icon": "📖"},
    {"min": 0, "name": "初学者", "icon": "🌱"},
]

def get_tier(stars: int):
    for t in TIERS:
        if stars >= t["min"]:
            return {"name": t["name"], "icon": t["icon"]}
    return TIERS[-1]

class LeaderboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_leaderboard(self, filter: str = "all", limit: int = 20):
        today = datetime.now(timezone.utc).date()
        week_start = today - timedelta(days=today.weekday())
        
        # Aggregate stars per user
        query = select(
            User.id,
            User.username,
            func.coalesce(func.sum(PracticeSession.correct_count), 0).label("stars")
        ).outerjoin(
            PracticeSession, PracticeSession.user_id == User.id
        ).where(
            User.role == "student"
        )
        
        if filter == "weekly":
            query = query.where(
                PracticeSession.started_at >= datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
            )
        
        query = query.group_by(User.id, User.username).order_by(func.coalesce(func.sum(PracticeSession.correct_count), 0).desc())
        
        result = await self.db.execute(query)
        rows = result.all()
        
        entries = []
        for rank, row in enumerate(rows[:limit], 1):
            tier = get_tier(row.stars)
            entries.append({
                "rank": rank,
                "user_id": row.id,
                "username": row.username,
                "stars": row.stars,
                "tier": tier["name"],
                "tier_icon": tier["icon"]
            })
        
        return {
            "filter": filter,
            "entries": entries,
            "total_participants": len(rows)
        }

    async def get_user_rank(self, user_id: int, filter: str = "all"):
        leaderboard = await self.get_leaderboard(filter, limit=None)
        
        for entry in leaderboard["entries"]:
            if entry["user_id"] == user_id:
                return entry
        
        return None
```

**`app/routers/leaderboard.py`:**

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.models import User
from app.services.leaderboard_service import LeaderboardService
from app.routers.users import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

@router.get("/")
async def get_leaderboard(
    filter: str = Query("all", regex="^(all|weekly)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = LeaderboardService(db)
    return await service.get_leaderboard(filter)

@router.get("/me")
async def get_my_rank(
    filter: str = Query("all", regex="^(all|weekly)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = LeaderboardService(db)
    rank = await service.get_user_rank(current_user.id, filter)
    return {"rank": rank}
```

### Task 2

Add to frontend:
- Types in `frontend/src/services/api.ts`
- `LeaderboardPage.tsx` with tabs for all/weekly

### Task 3

Add link in Dashboard to `/leaderboard`

### Task 4

Tests + commit + push
