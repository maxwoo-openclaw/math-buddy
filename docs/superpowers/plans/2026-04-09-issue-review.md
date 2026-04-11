# MathBuddy Issue Review — 2026-04-09

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document findings from a full codebase review. Two prior issues (admin self-registration, session ownership) are already fixed. One new issue found: N+1 query in `get_session_stats`.

**Status Summary:**
| # | Issue | Severity | Status |
|---|-------|---------|--------|
| 1  | Admin self-registration | CRITICAL | ✅ FIXED |
| 2  | Session ownership checks | CRITICAL | ✅ FIXED |
| 3  | Division by zero in accuracy | HIGH | ✅ FIXED |
| 4  | No rate limiting | HIGH | ✅ FIXED |
| 5  | Missing FK indexes | HIGH | ✅ FIXED |
| 6  | Hardcoded SECRET_KEY | CRITICAL | ✅ FIXED (validator present) |
| 7  | CORS wildcard origins | CRITICAL | ✅ FIXED |
| 8  | Missing rollback on exception | MEDIUM | ✅ FIXED |
| 9  | No pagination on list endpoints | MEDIUM | ✅ FIXED |
| 10 | datetime.utcnow() deprecation | LOW | ✅ FIXED |
| NEW | N+1 query in get_session_stats | MEDIUM | 📋 NEW — see Task 1 |

---

## Prior Issues — Confirmed Fixed

### Issue #1: Admin Self-Registration (CRITICAL) — ✅ FIXED
- `UserCreate` schema in `app/schemas/user.py` has no `role` field
- `app/routers/auth.py` hardcodes `role="student"` on registration
- No client-side role escalation possible

### Issue #2: Session Ownership (CRITICAL) — ✅ FIXED
- `submit_answer`, `get_session_stats`, `complete_session` all check `session.user_id != user_id`
- Routers pass `current_user.id` to service methods
- Unauthorized access raises `ValueError` → HTTP 404

---

## New Issue Found

### Task 1: N+1 Query in `get_session_stats`

**Severity:** MEDIUM
**Files:**
- Modify: `app/services/practice_service.py:158-167`

**Issue:** `get_session_stats` fetches all `SessionAnswer` records, then loops over each and executes a separate `SELECT MathProblem WHERE id = :problem_id`. For a session with N answers, this generates N+1 database queries.

```python
# Current (N+1 queries):
result = await self.db.execute(
    select(SessionAnswer).where(SessionAnswer.session_id == session_id)
)
answers = list(result.scalars().all())

answer_responses = []
for a in answers:
    result = await self.db.execute(
        select(MathProblem).where(MathProblem.id == a.problem_id)  # ← 1 query per answer
    )
    problem = result.scalar_one_or_none()
    ...
```

**Fix:** Batch-fetch all problems in a single query using `where(MathProblem.id.in_([a.problem_id for a in answers]))`.

```python
# Fixed (2 queries total):
result = await self.db.execute(
    select(SessionAnswer).where(SessionAnswer.session_id == session_id)
)
answers = list(result.scalars().all())

problem_ids = [a.problem_id for a in answers]
result = await self.db.execute(
    select(MathProblem).where(MathProblem.id.in_(problem_ids))
)
problems = {p.id: p for p in result.scalars().all()}

answer_responses = []
for a in answers:
    problem = problems.get(a.problem_id)
    if problem:
        answer_responses.append(AnswerResponse(...))
```

---

## Low-Priority Observations (No Action Required)

1. **Redundant `if session:` in `complete_session`** (`app/services/practice_service.py`): After `if session.user_id != user_id` raises, the subsequent `if session:` is unreachable. Minor dead code — does not affect correctness.

2. **`verify_token` swallows all JWT errors**: `except JWTError: return None` makes debugging harder (can't distinguish expired vs malformed vs bad signature). This is intentional for the auth flow — not a bug.

3. **`SECRET_KEY` validator depends on `ENVIRONMENT=production`**: The `field_validator` in `app/config.py` only raises if `ENVIRONMENT=production` is explicitly set. If the env var is absent, the default key is silently used. Already tracked in GitHub issue #6 (closed). Consider a more robust approach (e.g., require `SECRET_KEY` to be explicitly set in production, no default).

---

## Verification

- [ ] Issues #1–#10 from prior reviews are confirmed fixed in current codebase
- [ ] N+1 query in `get_session_stats` confirmed present
- [ ] Plan filed at `docs/superpowers/plans/2026-04-09-issue-review.md`
