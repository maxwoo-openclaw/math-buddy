# Achievement System Design

**Date:** 2026-04-09
**Feature:** A2 - Achievement System
**Status:** Approved

---

## Overview

Gamification feature that rewards students with achievement badges for hitting milestones in their math practice. Achievements are checked after each session completes and auto-granted when unlocked.

---

## Achievement Definitions

### Category: 持續練習 (Consistency)

| ID | Key | Name | Icon | Condition |
|----|-----|------|------|-----------|
| consistency_1 | beginner | 初學者 | 🌟 | Complete 1 session |
| consistency_2 | week_streak | 坚持不懈 | 🔥 | Practice 7 consecutive days |
| consistency_3 | dedicated | 勤奋好学 | 💪 | Complete 50 sessions |

### Category: 科目專精 (Operation Mastery)

| ID | Key | Name | Icon | Condition |
|----|-----|------|------|-----------|
| operation_add | add_master | 加法高手 | 🧮 | Addition accuracy ≥ 90% with ≥ 30 attempts |
| operation_sub | sub_master | 减法达人 | ➖ | Subtraction accuracy ≥ 90% with ≥ 30 attempts |
| operation_mul | mul_master | 乘法专家 | ✖️ | Multiplication accuracy ≥ 90% with ≥ 30 attempts |
| operation_div | div_master | 除法大师 | ➗ | Division accuracy ≥ 90% with ≥ 30 attempts |

### Category: 里程碑 (Milestones)

| ID | Key | Name | Icon | Condition |
|----|-----|------|------|-----------|
| milestone_perfect | perfect_session | 百发百中 | 🎯 | Complete a session with 100% accuracy (min 5 problems) |
| milestone_100 | century | 知识渊博 | 📚 | Total 100 problems solved |
| milestone_500 | scholar | 学富五车 | 📖 | Total 500 problems solved |
| milestone_1000 | polymath | 博学多才 | 🧠 | Total 1000 problems solved |
| milestone_stars | star_collector | 星级玩家 | ⭐ | Earn 100 total stars |

---

## Data Model

### New Table: `achievements`
```python
class Achievement(Base):
    __tablename__ = "achievements"
    
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)  # e.g., "add_master"
    name = Column(String, nullable=False)              # e.g., "加法高手"
    icon = Column(String, nullable=False)             # e.g., "🧮"
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)          # "consistency" | "operation" | "milestone"
```

### New Table: `user_achievements`
```python
class UserAchievement(Base):
    __tablename__ = "user_achievements"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_key = Column(String, ForeignKey("achievements.key"), nullable=False)
    earned_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement")
```

---

## Achievement Service

### `AchievementService`

```python
class AchievementService:
    # Check all achievements for a user after session completes
    async def check_and_award(self, user_id: int, session_id: int) -> list[Achievement]:
        """Returns list of newly awarded achievements"""
        
    # Get all achievements (locked + earned) for a user
    async def get_user_achievements(self, user_id: int) -> dict:
        """Returns {achievements: [...], earned_count: N, total_count: M}"""
        
    # Count consecutive login days
    async def get_streak_days(self, user_id: int) -> int:
        """Returns number of consecutive days with at least 1 session"""
```

### Achievement Logic

**consistency_1 (初學者):** `total_sessions >= 1`

**consistency_2 (坚持不懈):** `streak_days >= 7`

**consistency_3 (勤奋好学):** `total_sessions >= 50`

**operation_* (科目專精):** `operation_accuracy >= 90% AND operation_attempts >= 30`

**milestone_perfect (百发百中):** Any session with `accuracy = 100%` and `total_problems >= 5`

**milestone_100 (知识渊博):** `total_problems >= 100`

**milestone_500 (学富五车):** `total_problems >= 500`

**milestone_1000 (博学多才):** `total_problems >= 1000`

**milestone_stars (星级玩家):** `total_stars >= 100`

---

## API Endpoints

### `GET /api/achievements`
Get all achievements for current user (student)
```json
{
  "achievements": [
    {
      "key": "add_master",
      "name": "加法高手",
      "icon": "🧮",
      "description": "Addition accuracy ≥ 90%",
      "category": "operation",
      "earned": true,
      "earned_at": "2026-04-09T10:30:00Z"
    }
  ],
  "earned_count": 3,
  "total_count": 13
}
```

### `GET /api/achievements/parent/{student_id}`
Parent/Admin view of student's achievements

---

## Frontend Display

### Student Achievement Panel
- Located on Dashboard or Practice page
- Grid of badge icons (visual, colorful)
- Unearned badges shown as greyed out with "?"
- Earned badges show icon + name on hover
- When new achievement unlocks: celebratory toast notification

### Badge Design
- Circular badge with icon centered
- Earned: full color, subtle glow/shadow
- Locked: grayscale, slight opacity
- Categories use different border colors:
  - Consistency: gold border
  - Operation: blue border
  - Milestone: purple border

### Toast Notification
When achievement unlocks:
```
🎉 新成就解锁！
加法高手
```

---

## Integration with Parent Dashboard

Add to Parent Dashboard analysis view:
- Section showing child's achievements
- Badge grid display (compact version)
- Recent achievements with dates

---

## Implementation Notes

- Achievement check runs AFTER session completes (in `complete_session` or similar)
- Only award each achievement once per user
- Streak calculation: count days with sessions, check if consecutive from today going back
- Total stars = sum of `(accuracy * stars_per_session)` — need to check how stars are calculated

---

## Acceptance Criteria

- [ ] Achievements table seeded with all 13 achievements
- [ ] UserAchievements table tracks earned achievements
- [ ] `check_and_award` correctly identifies newly unlocked achievements
- [ ] `GET /api/achievements` returns all achievements with earned status
- [ ] Student sees visual badge grid on frontend
- [ ] Toast notification appears when achievement unlocks
- [ ] Parent can see child's achievements in Parent Dashboard
- [ ] Each achievement awarded only once per user (idempotent)
