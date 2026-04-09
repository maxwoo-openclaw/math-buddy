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

def get_tier(stars: int) -> dict:
    for t in TIERS:
        if stars >= t["min"]:
            return {"name": t["name"], "icon": t["icon"]}
    return TIERS[-1]


class LeaderboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_leaderboard(self, filter: str = "all", limit: int = 20) -> dict:
        today = datetime.now(timezone.utc).date()
        week_start = today - timedelta(days=today.weekday())
        
        # Get stars per user (students only)
        query = (
            select(
                User.id,
                User.username,
                func.coalesce(func.sum(PracticeSession.correct_count), 0).label("stars")
            )
            .outerjoin(PracticeSession, PracticeSession.user_id == User.id)
            .where(User.role == "student")
            .group_by(User.id, User.username)
            .order_by(func.coalesce(func.sum(PracticeSession.correct_count), 0).desc())
        )
        
        result = await self.db.execute(query)
        rows = result.all()
        
        # Filter by week if needed
        if filter == "weekly":
            week_start_dt = datetime.combine(week_start, datetime.min.time()).replace(tzinfo=timezone.utc)
            # Re-query with weekly filter
            weekly_query = (
                select(
                    User.id,
                    User.username,
                    func.coalesce(func.sum(PracticeSession.correct_count), 0).label("stars")
                )
                .outerjoin(PracticeSession, PracticeSession.user_id == User.id)
                .where(
                    User.role == "student",
                    PracticeSession.started_at >= week_start_dt
                )
                .group_by(User.id, User.username)
                .order_by(func.coalesce(func.sum(PracticeSession.correct_count), 0).desc())
            )
            result = await self.db.execute(weekly_query)
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

    async def get_user_rank(self, user_id: int, filter: str = "all") -> dict | None:
        leaderboard = await self.get_leaderboard(filter, limit=None)
        for entry in leaderboard["entries"]:
            if entry["user_id"] == user_id:
                return entry
        return None
