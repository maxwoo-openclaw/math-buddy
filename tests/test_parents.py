"""
Parent dashboard endpoint tests for MathBuddy API.
"""
import pytest
import uuid
from app.models import User
from app.utils.security import hash_password


def unique_name(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


@pytest.mark.asyncio
async def test_generate_invite_code(client, db_session):
    """Student can generate an invite code"""
    username = unique_name("codestudent")
    # Create student directly in DB
    student = User(
        username=username,
        email=f"{username}@test.com",
        password_hash=hash_password("test123"),
        role="student",
    )
    db_session.add(student)
    await db_session.commit()

    # Login
    login = await client.post("/api/auth/login", json={
        "username": username,
        "password": "test123"
    })
    token = login.json()["access_token"]

    # Generate code
    resp = await client.post(
        "/api/parents/generate-code",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "invite_code" in data
    assert len(data["invite_code"]) == 8  # 8-char hex code
    assert "expires_at" in data


@pytest.mark.asyncio
async def test_generate_code_non_student_fails(client, db_session):
    """Non-student cannot generate invite code"""
    username = unique_name("codeparent")
    # Create parent directly in DB
    parent = User(
        username=username,
        email=f"{username}@test.com",
        password_hash=hash_password("test123"),
        role="parent",
    )
    db_session.add(parent)
    await db_session.commit()

    # Login
    login = await client.post("/api/auth/login", json={
        "username": username,
        "password": "test123"
    })
    token = login.json()["access_token"]

    resp = await client.post(
        "/api/parents/generate-code",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 400
    assert "Only students" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_parent_dashboard_requires_auth(client):
    """GET /api/parents/dashboard without token returns 401"""
    resp = await client.get("/api/parents/dashboard")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_parent_dashboard_student_fails(client, db_session):
    """Student cannot access parent dashboard"""
    username = unique_name("dashboardstudent")
    # Create student directly in DB
    student = User(
        username=username,
        email=f"{username}@test.com",
        password_hash=hash_password("test123"),
        role="student",
    )
    db_session.add(student)
    await db_session.commit()

    login = await client.post("/api/auth/login", json={
        "username": username,
        "password": "test123"
    })
    token = login.json()["access_token"]

    resp = await client.get(
        "/api/parents/dashboard",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_link_students_empty(client, db_session):
    """Parent with no linked students gets empty list"""
    username = unique_name("emptyparent")
    # Create parent directly in DB
    parent = User(
        username=username,
        email=f"{username}@test.com",
        password_hash=hash_password("test123"),
        role="parent",
    )
    db_session.add(parent)
    await db_session.commit()

    login = await client.post("/api/auth/login", json={
        "username": username,
        "password": "test123"
    })
    token = login.json()["access_token"]

    resp = await client.get(
        "/api/parents/dashboard",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["students"] == []


@pytest.mark.asyncio
async def test_link_student_by_code(client, db_session):
    """Parent can link to student via invite code"""
    student_username = unique_name("linkstudent")
    parent_username = unique_name("linkparent")

    # Create student and generate code
    student = User(
        username=student_username,
        email=f"{student_username}@test.com",
        password_hash=hash_password("test123"),
        role="student",
    )
    db_session.add(student)
    await db_session.commit()

    login = await client.post("/api/auth/login", json={
        "username": student_username,
        "password": "test123"
    })
    student_token = login.json()["access_token"]

    code_resp = await client.post(
        "/api/parents/generate-code",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    invite_code = code_resp.json()["invite_code"]

    # Create parent and link with code
    parent = User(
        username=parent_username,
        email=f"{parent_username}@test.com",
        password_hash=hash_password("test123"),
        role="parent",
    )
    db_session.add(parent)
    await db_session.commit()

    login = await client.post("/api/auth/login", json={
        "username": parent_username,
        "password": "test123"
    })
    parent_token = login.json()["access_token"]

    link_resp = await client.post(
        "/api/parents/link",
        headers={"Authorization": f"Bearer {parent_token}"},
        params={"code": invite_code}
    )
    assert link_resp.status_code == 200
    assert link_resp.json()["success"] is True

    # Verify student appears in dashboard
    dash_resp = await client.get(
        "/api/parents/dashboard",
        headers={"Authorization": f"Bearer {parent_token}"}
    )
    assert dash_resp.status_code == 200
    students = dash_resp.json()["students"]
    assert len(students) == 1
    assert students[0]["username"] == student_username


@pytest.mark.asyncio
async def test_invalid_invite_code(client, db_session):
    """Invalid invite code returns error"""
    username = unique_name("invalidparent")
    # Create parent directly in DB
    parent = User(
        username=username,
        email=f"{username}@test.com",
        password_hash=hash_password("test123"),
        role="parent",
    )
    db_session.add(parent)
    await db_session.commit()

    login = await client.post("/api/auth/login", json={
        "username": username,
        "password": "test123"
    })
    token = login.json()["access_token"]

    resp = await client.post(
        "/api/parents/link",
        headers={"Authorization": f"Bearer {token}"},
        params={"code": "00000000"}
    )
    assert resp.status_code == 400
    assert "Invalid invite code" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_admin_can_access_parent_dashboard(client, admin_auth_headers):
    """Admin role can access parent dashboard"""
    resp = await client.get(
        "/api/parents/dashboard",
        headers=admin_auth_headers
    )
    assert resp.status_code == 200
