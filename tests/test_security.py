"""
Security utilities tests for MathBuddy API.
"""
import pytest
from app.utils.security import hash_password, verify_password, create_access_token


def test_hash_password_returns_hash():
    """hash_password returns a bcrypt hash string."""
    h = hash_password("testpassword")
    assert h is not None
    assert h.startswith("$2b$") or h.startswith("$2a$")


def test_verify_password_correct():
    """verify_password returns True for correct password."""
    h = hash_password("testpassword")
    assert verify_password("testpassword", h) is True


def test_verify_password_incorrect():
    """verify_password returns False for incorrect password."""
    h = hash_password("testpassword")
    assert verify_password("wrongpassword", h) is False


def test_hash_and_verify_various_passwords():
    """hash_password and verify_password work with various passwords."""
    passwords = [
        "short",
        "a very long password that exceeds typical length limits",
        "p@ssw0rd!#$%^&*()",
        "中文密碼",
        "password with spaces but still valid",
    ]
    for pwd in passwords:
        h = hash_password(pwd)
        assert verify_password(pwd, h) is True
        assert verify_password(pwd + "wrong", h) is False


def test_create_access_token_returns_string():
    """create_access_token returns a JWT token string."""
    token = create_access_token({"sub": "testuser", "role": "student"})
    assert isinstance(token, str)
    assert len(token) > 0
    assert token.count(".") == 2  # JWT has 3 parts separated by dots
