# Parent Dashboard Feature Design

**Date:** 2026-04-09
**Feature:** A3 - Parent Dashboard
**Status:** Approved

---

## Overview

Enable parents to monitor their children's math practice progress. Two access modes:
1. **Parent account** — links to 1+ student accounts, views their own children's progress
2. **Admin account** — can view all students' progress

---

## Data Model Changes

### New Role: `parent`
```python
class User(Base):
    # existing fields...
    role: str  # now: 'student' | 'admin' | 'parent'
```

### Student Enhancement
```python
class User(Base):
    # existing fields...
    invite_code: str = None          # nullable
    invite_expires_at: DateTime = None  # nullable
```

### New Link Table: `parent_student_links`
```python
class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"
    
    id: int (PK)
    parent_id: int (FK -> users.id)
    student_id: int (FK -> users.id)
    linked_at: DateTime
    linked_by: str  # 'admin' | 'self' (invite code)
```

---

## Linking Methods

### Method 1: Admin Assigns
- Admin navigates to student management
- Select student(s), click "Assign to Parent"
- Choose existing parent account or create new
- Link created immediately

### Method 2: Invite Code
- Student generates invite code (valid 72 hours)
- Student shares code with parent
- Parent enters code in "Link Student" form
- Code consumed (one-time use), link created

---

## API Endpoints

### `POST /api/parents/link`
Link parent to student (admin or self-invite)
- Body: `{ student_id, parent_id }` (admin)
- Body: `{ invite_code }` (parent via code)
- Response: `{ success, student_name }`

### `DELETE /api/parents/link/{link_id}`
Unlink student from parent

### `GET /api/parents/students`
List students linked to current parent

### `GET /api/parents/dashboard`
Core metrics for linked students
```json
{
  "students": [
    {
      "id": 1,
      "username": "john_doe",
      "total_sessions": 10,
      "total_problems": 100,
      "overall_accuracy": 85.5,
      "stars_earned": 45
    }
  ]
}
```

### `GET /api/parents/dashboard/analysis`
Detailed analysis per student
```json
{
  "student_id": 1,
  "operation_breakdown": {
    "addition": { "attempted": 30, "accuracy": 90.0 },
    "subtraction": { "attempted": 25, "accuracy": 80.0 },
    "multiplication": { "attempted": 25, "accuracy": 70.0 },
    "division": { "attempted": 20, "accuracy": 60.0 }
  },
  "difficulty_breakdown": {
    "easy": { "accuracy": 95.0 },
    "medium": { "accuracy": 75.0 },
    "hard": { "accuracy": 50.0 }
  },
  "weakest_operation": "division",
  "strongest_operation": "addition"
}
```

### `GET /api/parents/dashboard/trends`
Progress over time
- Query params: `student_id`, `days=7|30`
```json
{
  "student_id": 1,
  "days": 30,
  "trend": [
    { "date": "2026-04-01", "accuracy": 80.0, "problems": 15 },
    { "date": "2026-04-02", "accuracy": 82.0, "problems": 20 },
    ...
  ]
}
```

---

## Frontend Pages

### Parent Dashboard (`/parent`)
Professional, data-focused dashboard

**Layout:**
- Header: "Parent Dashboard" + logout
- Student selector dropdown (if multiple linked students)
- 3-column card layout for core metrics:
  - Total Sessions
  - Total Problems Solved
  - Overall Accuracy
- Tab navigation:
  - Overview (core metrics)
  - Analysis (operation/difficulty breakdown)
  - Trends (7-day / 30-day charts)

**Charts (using Recharts):**
- Line chart for accuracy trends
- Bar chart for operation breakdown

---

## Auth & Permissions

| Action | Student | Parent | Admin |
|--------|---------|--------|-------|
| View own practice | ✅ | ❌ | ❌ |
| View linked students | ❌ | ✅ | ✅ |
| Link student (code) | ❌ | ✅ | ❌ |
| Link student (admin) | ❌ | ❌ | ✅ |
| Unlink student | ❌ | Own only | All |

---

## Implementation Order

1. **Database** — Add `parent` role, `invite_code`/`invite_expires_at`, `ParentStudentLink` table
2. **Backend APIs** — All `/api/parents/*` endpoints
3. **Frontend API client** — Add parent service methods
4. **Parent Dashboard page** — Full dashboard with tabs and charts

---

## Dependencies

- Frontend: `recharts` for charts (already in frontend? check package.json)
- Backend: No new dependencies

---

## Acceptance Criteria

- [ ] Parent can register and login
- [ ] Admin can link student to parent
- [ ] Student can generate 72hr invite code
- [ ] Parent can link via invite code
- [ ] Parent sees list of linked students
- [ ] Parent sees core metrics (sessions, problems, accuracy)
- [ ] Parent sees operation breakdown (addition/subtraction/multiplication/division)
- [ ] Parent sees difficulty breakdown (easy/medium/hard)
- [ ] Parent sees 7-day and 30-day accuracy trends
- [ ] Admin can view all students (existing + new parent-linked)
