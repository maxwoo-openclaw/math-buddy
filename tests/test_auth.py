"""
Auth endpoint tests for MathBuddy API.
"""
import pytest


@pytest.mark.asyncio
async def test_register(client):
    response = await client.post(
        "/api/auth/register",
        json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"]
    assert data["user"]["username"] == "newuser"
    assert data["user"]["email"] == "new@example.com"


@pytest.mark.asyncio
async def test_register_duplicate_username(client, test_user):
    response = await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "another@example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 400
    assert "already taken" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login(client, test_user):
    response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "testpassword"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client, test_user):
    response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_me(client, auth_headers, test_user):
    """GET /api/users/me returns current user info."""
    response = await client.get("/api/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_get_me_no_token(client):
    """GET /api/users/me without token returns 401."""
    response = await client.get("/api/users/me")
    assert response.status_code == 401
