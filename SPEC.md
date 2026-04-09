# MathBuddy - Math Practice App Specification

## Overview
- **Name**: MathBuddy
- **Type**: Web application (FastAPI + React)
- **Purpose**: Primary school math practice with quizzes and progress tracking
- **Target Users**: Primary school students (ages 6-12) and admin teachers

## Tech Stack
- Backend: Python FastAPI (async) + SQLite (aiosqlite + SQLAlchemy)
- Auth: JWT (python-jose + passlib[bcrypt])
- Frontend: React 18 + Vite + TypeScript
- Routing: React Router v6

## Features

### User Roles
1. **Student**: Practice math, view own stats and history
2. **Admin**: Manage users, create/edit/delete math problems

### Operations
- Addition (+)
- Subtraction (-)
- Multiplication (×)
- Division (÷)

### Difficulty Levels
- Easy: Single digit numbers (1-9)
- Medium: Double digit numbers (10-99)
- Hard: Triple digit numbers (100-999)

### Backend APIs

#### Auth (`/api/auth`)
- `POST /register` - Register new user (student or admin)
- `POST /login` - Login and receive JWT token

#### Users (`/api/users`)
- `GET /me` - Get current user profile
- `GET /` - Admin: list all users
- `DELETE /{id}` - Admin: delete a user

#### Problems (`/api/problems`)
- `GET /` - List problems (filter by operation, difficulty)
- `POST /` - Admin: create new problem
- `PUT /{id}` - Admin: update problem
- `DELETE /{id}` - Admin: delete problem

#### Practice (`/api/practice`)
- `POST /session` - Start a practice session
- `POST /session/{id}/answer` - Submit an answer
- `GET /session/{id}/stats` - Get session results

#### Gamification (`/api/gamification`)
- `GET /streak` - Get current and longest streak info
- `POST /streak/record` - Record a practice day (call after session completes)
- `GET /daily-challenge` - Get today's challenge status
- `POST /daily-challenge/submit` - Submit challenge score

#### Speed Run & Skill Tree (`/api/gamification`)
- `POST /speed-run/submit` - Submit a speed run result
- `GET /speed-run/best?time_limit=60` - Get personal best for 60s or 120s
- `GET /speed-run/leaderboard?time_limit=60` - Get speed run leaderboard
- `GET /skill-tree` - Get user's skill tree (levels, XP, progress per operation)
- `POST /skill-tree/xp` - Award XP for a correct answer

### Frontend Pages

#### Auth Pages
- `/auth` - Combined login/register
- `/login` - Login form
- `/register` - Registration form

#### Student Pages
- `/practice` - Main practice interface (one problem at a time)
- `/dashboard` - Stats and history

#### Admin Pages
- `/admin` - Admin dashboard

### Data Models

#### User
```
id: int (PK)
username: str (unique)
email: str (unique)
password_hash: str
role: str ('student' | 'admin')
invite_code: str (unique, nullable)
invite_expires_at: datetime (nullable)
created_at: datetime
```

#### MathProblem
```
id: int (PK)
operation_type: str ('addition' | 'subtraction' | 'multiplication' | 'division')
difficulty: str ('easy' | 'medium' | 'hard')
question: str
answer: int
created_by: int (FK -> user.id)
created_at: datetime
```

#### PracticeSession
```
id: int (PK)
user_id: int (FK)
operation_filter: str (optional, null = all)
difficulty_filter: str (optional, null = all)
total_problems: int
correct_count: int
started_at: datetime
completed_at: datetime (nullable)
```

#### SessionAnswer
```
id: int (PK)
session_id: int (FK)
problem_id: int (FK)
user_answer: int
is_correct: bool
answered_at: datetime
```

#### UserStreak (Gamification)
```
id: int (PK)
user_id: int (FK -> user.id, unique)
current_streak: int (consecutive days practiced)
longest_streak: int
last_practice_date: datetime
streak_dates: str (JSON list of date strings)
```

#### DailyChallenge (Gamification)
```
id: int (PK)
target_date: str (unique, e.g. "2026-04-09")
title: str
description: str
total_problems: int
created_at: datetime
```

#### DailyChallengeAttempt (Gamification)
```
id: int (PK)
challenge_id: int (FK -> daily_challenges.id)
user_id: int (FK -> user.id)
score: int
total_problems: int
time_taken_seconds: int (nullable)
completed_at: datetime
```

#### SpeedRunResult (Speed Run)
```
id: int (PK)
user_id: int (FK -> user.id)
time_limit_seconds: int (60 | 120)
score: int (problems solved)
total_problems: int
accuracy: int (percentage)
time_taken_seconds: int (nullable)
completed_at: datetime
```

#### SkillLevel (Skill Tree)
```
id: int (PK)
user_id: int (FK -> user.id)
operation: str ('addition' | 'subtraction' | 'multiplication' | 'division')
level: int (1-10)
xp: int (current XP towards next level)
total_xp: int (lifetime XP)
```

## UI Design Notes
- Colorful, friendly interface suitable for children
- Large buttons, simple navigation
- Encouraging messages on correct answers
- Clear progress indicators
- Bright colors: primary blue (#4A90D9), success green (#4CAF50), warning orange (#FF9800)