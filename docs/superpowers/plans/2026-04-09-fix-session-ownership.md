# Issue #2 Fix: Missing Session Ownership Checks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure users can only access/modify their own practice sessions. Three functions need ownership checks.

**Architecture:** 
- Add `user_id` parameter to service methods
- Router passes `current_user.id` from JWT to service
- Service verifies `session.user_id == user_id` before any operation
- Raise `ValueError("Unauthorized")` if mismatch

**Tech Stack:** Python, FastAPI, SQLAlchemy, async/await

---

### Task 1: Update submit_answer with ownership check

**Files:**
- Modify: `app/services/practice_service.py`
- Modify: `app/routers/practice.py`

- [ ] **Step 1: Add user_id parameter to submit_answer in practice_service.py**

```python
# Change from:
async def submit_answer(
    self,
    session_id: int,
    data: AnswerSubmit,
) -> AnswerResponse:

# To:
async def submit_answer(
    self,
    session_id: int,
    user_id: int,
    data: AnswerSubmit,
) -> AnswerResponse:
```

- [ ] **Step 2: Add ownership check after session fetch in submit_answer**

```python
# After: session = result.scalar_one_or_none()
# Add:
if session.user_id != user_id:
    raise ValueError("Unauthorized")
```

- [ ] **Step 3: Update router to pass user_id**

```python
# In app/routers/practice.py submit_answer endpoint:
# Change from:
result = await service.submit_answer(session_id, data)
# To:
result = await service.submit_answer(session_id, current_user.id, data)
```

---

### Task 2: Update get_session_stats with ownership check

**Files:**
- Modify: `app/services/practice_service.py`
- Modify: `app/routers/practice.py`

- [ ] **Step 4: Add user_id parameter to get_session_stats**

```python
# Change from:
async def get_session_stats(self, session_id: int) -> dict:

# To:
async def get_session_stats(self, session_id: int, user_id: int) -> dict:
```

- [ ] **Step 5: Add ownership check in get_session_stats**

```python
# After session fetch, before returning stats:
if session.user_id != user_id:
    raise ValueError("Unauthorized")
```

- [ ] **Step 6: Update router to pass user_id**

```python
# Change from:
stats = await service.get_session_stats(session_id)
# To:
stats = await service.get_session_stats(session_id, current_user.id)
```

---

### Task 3: Update complete_session with ownership check

**Files:**
- Modify: `app/services/practice_service.py`
- Modify: `app/routers/practice.py`

- [ ] **Step 7: Add user_id parameter to complete_session**

```python
# Change from:
async def complete_session(self, session_id: int):

# To:
async def complete_session(self, session_id: int, user_id: int):
```

- [ ] **Step 8: Add ownership check in complete_session**

```python
# After session fetch:
if session.user_id != user_id:
    raise ValueError("Unauthorized")
```

- [ ] **Step 9: Update router to pass user_id**

```python
# Change from:
await service.complete_session(session_id)
# To:
await service.complete_session(session_id, current_user.id)
```

---

### Task 4: Run tests and verify

**Files:**
- Run: `python -m pytest tests/test_practice.py -v`

- [ ] **Step 10: Run practice tests**

- [ ] **Step 11: Commit**

```bash
git add app/services/practice_service.py app/routers/practice.py
git commit -m "fix: Add session ownership checks (issue #2)"
git push origin main
```

---

## Verification Checklist

- [ ] submit_answer verifies session.user_id == user_id
- [ ] get_session_stats verifies session.user_id == user_id
- [ ] complete_session verifies session.user_id == user_id
- [ ] Unauthorized access raises ValueError (returns 404 to client)
- [ ] Own session access works normally
- [ ] Tests pass
- [ ] Commit pushed to GitHub
