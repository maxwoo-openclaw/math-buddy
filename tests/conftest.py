"""
Test configuration for MathBuddy API.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from main import app
from app.database import Base, get_db
from app.models import User
from app.utils.security import hash_password


# Test database setup - use file-based SQLite for proper session sharing
import tempfile

_test_db_file = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{_test_db_file.name}"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestingSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def override_get_db():
    async with TestingSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(scope="function")
async def db_session():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac


@pytest_asyncio.fixture(scope="function")
async def test_user(db_session):
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash=hash_password("testpassword"),
        role="student",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def admin_user(db_session):
    user = User(
        username="adminuser",
        email="admin@example.com",
        password_hash=hash_password("adminpassword"),
        role="admin",
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def auth_headers(client, test_user):
    response = await client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "testpassword"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def admin_auth_headers(client, admin_user):
    response = await client.post(
        "/api/auth/login",
        json={"username": "adminuser", "password": "adminpassword"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
