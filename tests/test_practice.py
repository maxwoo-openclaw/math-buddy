"""
Practice endpoint tests for MathBuddy API.
"""
import pytest
from app.models import MathProblem, PracticeSession


@pytest.mark.asyncio
async def test_start_session(client, auth_headers):
    """POST /api/practice/session - start a practice session."""
    response = await client.post(
        "/api/practice/session",
        headers=auth_headers,
        json={
            "operation_filter": "addition",
            "difficulty_filter": "easy",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "session_id" in data
    assert "started_at" in data


@pytest.mark.asyncio
async def test_submit_answer_correct(client, auth_headers, db_session):
    """POST /api/practice/session/{id}/answer - submit correct answer."""
    # Create a problem
    problem = MathProblem(
        operation_type="addition",
        difficulty="easy",
        question="2 + 2 = ?",
        answer=4,
        created_by=1,
    )
    db_session.add(problem)
    await db_session.commit()
    await db_session.refresh(problem)

    # Start a session
    session = PracticeSession(
        user_id=1,
        operation_filter="addition",
        difficulty_filter="easy",
        total_problems=0,
        correct_count=0,
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)

    # Submit correct answer
    response = await client.post(
        f"/api/practice/session/{session.id}/answer",
        headers=auth_headers,
        json={
            "problem_id": problem.id,
            "user_answer": 4,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_correct"] is True
    assert data["correct_answer"] == 4


@pytest.mark.asyncio
async def test_submit_answer_wrong(client, auth_headers, db_session):
    """POST /api/practice/session/{id}/answer - submit wrong answer."""
    # Create a problem
    problem = MathProblem(
        operation_type="addition",
        difficulty="easy",
        question="2 + 2 = ?",
        answer=4,
        created_by=1,
    )
    db_session.add(problem)
    await db_session.commit()
    await db_session.refresh(problem)

    # Start a session
    session = PracticeSession(
        user_id=1,
        operation_filter="addition",
        difficulty_filter="easy",
        total_problems=0,
        correct_count=0,
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)

    # Submit wrong answer
    response = await client.post(
        f"/api/practice/session/{session.id}/answer",
        headers=auth_headers,
        json={
            "problem_id": problem.id,
            "user_answer": 99,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_correct"] is False
    assert data["correct_answer"] == 4


@pytest.mark.asyncio
async def test_get_session_stats(client, auth_headers, db_session):
    """GET /api/practice/session/{id}/stats - get session stats."""
    # Create a problem
    problem = MathProblem(
        operation_type="addition",
        difficulty="easy",
        question="2 + 2 = ?",
        answer=4,
        created_by=1,
    )
    db_session.add(problem)
    await db_session.commit()
    await db_session.refresh(problem)

    # Start a session
    session = PracticeSession(
        user_id=1,
        operation_filter="addition",
        difficulty_filter="easy",
        total_problems=1,
        correct_count=1,
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)

    response = await client.get(
        f"/api/practice/session/{session.id}/stats",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session.id
    assert data["total_problems"] == 1
    assert data["correct_count"] == 1
    assert data["accuracy"] == 100.0


@pytest.mark.asyncio
async def test_get_session_not_found(client, auth_headers):
    """GET /api/practice/session/{id}/stats - non-existent returns 404."""
    response = await client.get(
        "/api/practice/session/99999/stats",
        headers=auth_headers,
    )
    assert response.status_code == 404
