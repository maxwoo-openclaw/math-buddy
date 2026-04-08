"""
User endpoint tests for MathBuddy API.
"""
import pytest


@pytest.mark.asyncio
async def test_get_me(client, auth_headers, test_user):
    """GET /api/users/me returns current user info."""
    response = await client.get("/api/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_list_users_admin(client, admin_auth_headers, test_user, admin_user):
    """GET /api/users - admin can list all users."""
    response = await client.get("/api/users/", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # Should have test_user and admin_user
    usernames = [u["username"] for u in data]
    assert "testuser" in usernames
    assert "adminuser" in usernames


@pytest.mark.asyncio
async def test_list_users_non_admin(client, auth_headers, test_user):
    """GET /api/users - non-admin cannot list users."""
    response = await client.get("/api/users/", headers=auth_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_user_admin(client, admin_auth_headers, test_user):
    """DELETE /api/users/{id} - admin can delete a user."""
    response = await client.delete(f"/api/users/{test_user.id}", headers=admin_auth_headers)
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_delete_user_non_admin(client, auth_headers, test_user):
    """DELETE /api/users/{id} - non-admin cannot delete (403)."""
    # Try to delete using non-admin auth (test_user trying to delete someone)
    response = await client.delete("/api/users/99999", headers=auth_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_user_not_found(client, admin_auth_headers):
    """DELETE /api/users/{id} - non-existent user returns 404."""
    response = await client.delete("/api/users/99999", headers=admin_auth_headers)
    assert response.status_code == 404
