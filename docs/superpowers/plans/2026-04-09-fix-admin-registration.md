# Issue #1 Fix: Users Can Self-Register as Admin

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove privilege escalation vulnerability — users cannot self-register as admin. Registration always defaults to `role="student"`.

**Architecture:** 
- Remove `role` field from `UserCreate` Pydantic schema (client cannot pass role)
- In `auth.py`, always set `role="student"` explicitly when creating user
- Backend validation ensures only admin-created users get admin role

**Tech Stack:** Python, FastAPI, Pydantic, SQLAlchemy

---

### Task 1: Remove `role` from UserCreate schema

**Files:**
- Modify: `app/schemas/user.py`

- [ ] **Step 1: Edit app/schemas/user.py — remove role from UserCreate**

```python
# Change from:
class UserCreate(UserBase):
    password: str
    role: Optional[str] = "student"

# To:
class UserCreate(UserBase):
    password: str
    # role removed — self-registration always defaults to "student"
```

---

### Task 2: Always set role="student" in auth.py

**Files:**
- Modify: `app/routers/auth.py`

- [ ] **Step 2: Edit app/routers/auth.py — always set role="student"**

```python
# Change from:
user = User(
    username=data.username,
    email=data.email,
    password_hash=hash_password(data.password),
    role=data.role or "student",
)

# To:
user = User(
    username=data.username,
    email=data.email,
    password_hash=hash_password(data.password),
    role="student",  # Always student on self-registration
)
```

---

### Task 3: Add admin-only registration endpoint (optional, for future admin-created users)

**Files:**
- Modify: `app/routers/users.py` (create admin-only user creation if needed)

*Note: For now, admin users can only be created directly in DB or via admin panel.*

---

### Task 4: Run tests to verify fix

**Files:**
- Run: `python -m pytest tests/test_auth.py -v`

- [ ] **Step 4: Run auth tests**

- [ ] **Step 5: Commit fix**

```bash
git add app/schemas/user.py app/routers/auth.py
git commit -m "fix: Remove self-registration role escalation (issue #1)"
```

---

## Verification Checklist

- [ ] `UserCreate` schema has no `role` field
- [ ] `auth.py` always sets `role="student"` on registration
- [ ] Attempting to register with `role="admin"` fails (schema rejects unknown fields)
- [ ] Existing tests pass
- [ ] Commit pushed to GitHub
