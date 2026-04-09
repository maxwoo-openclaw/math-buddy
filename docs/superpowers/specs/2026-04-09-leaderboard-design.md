# Leaderboard System Design

**Date:** 2026-04-09
**Feature:** A1 - Leaderboard
**Status:** Approved

---

## Overview

Real-time leaderboard showing student rankings based on total stars earned. Students can see their rank among all users and track weekly competition.

---

## Leaderboard Definitions

### Ranking Metric
- **Stars** = Total correct answers across all sessions (1 star per correct answer)
- Students ranked by total stars descending
- Ties broken by most recent activity

### Time Filters
- **All-Time** — Cumulative stars since account creation (default)
- **Weekly** — Stars earned in current week (Mon-Sun)

### Achievement Tiers
| Stars | Title | Badge |
|-------|-------|-------|
| 0 | 初学者 | 🌱 |
| 1-50 | 小学徒 | 📖 |
| 51-200 | 学习者 | 📚 |
| 201-500 | 进学者 | 🎓 |
| 501-1000 | 学者 | 🏅 |
| 1001-2000 | 学霸 | 🥈 |
| 2001-5000 | 数学高手 | 🥇 |
| 5000+ | 数学大师 | 👑 |

---

## Backend Design

### Database Schema
No new tables needed — use existing `PracticeSession.correct_count` aggregated per user.

### API Endpoints

**GET /api/leaderboard**
- Query params: `filter=all|weekly` (default: `all`)
- Returns top 20 users with rank, username, stars, tier
- Auth required (any logged-in user)

**GET /api/leaderboard/me**
- Query params: `filter=all|weekly` (default: `all`)
- Returns current user's rank and stats
- Auth required

### Response Shape
```json
{
  "filter": "all",
  "entries": [
    {
      "rank": 1,
      "user_id": 5,
      "username": "alice",
      "stars": 342,
      "tier": "进学者",
      "tier_icon": "🎓"
    }
  ],
  "total_participants": 42
}
```

---

## Frontend Design

### Leaderboard Page (`/leaderboard`)
- Tab toggle: All-Time | This Week
- Top 3 highlighted with gold/silver/bronze styling
- Current user highlighted with special border
- Shows user's rank even if not in top 20

### Visual Design
- Medal icons for top 3: 🥇🥈🥉
- Tier badge next to each username
- Stars count prominently displayed
- Compact table layout for mobile-friendly display

---

## Acceptance Criteria

- [x] Leaderboard API returns ranked student list
- [x] Weekly filter shows only current week's stars
- [x] User can see their own rank regardless of position
- [x] Tier system applied to all displayed entries
- [x] Leaderboard page accessible from main dashboard
- [x] No hardcoded values — stars derived from session data
