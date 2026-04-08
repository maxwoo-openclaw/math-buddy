"""
Problem endpoint tests for MathBuddy API.
"""
import pytest
from app.models import MathProblem


@pytest.mark.asyncio
async def test_list_problems(client, auth_headers, admin_auth_headers):
    """GET /api/problems returns list of problems."""
    response = await client.get("/api/problems/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_create_problem_admin(client, admin_auth_headers):
    """POST /api/problems - admin can create a problem."""
    response = await client.post(
        "/api/problems/",
        headers=admin_auth_headers,
        json={
            "operation_type": "addition",
            "difficulty": "easy",
            "question": "2 + 2 = ?",
            "answer": 4,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["operation_type"] == "addition"
    assert data["difficulty"] == "easy"
    assert data["question"] == "2 + 2 = ?"
    assert data["answer"] == 4


@pytest.mark.asyncio
async def test_create_problem_non_admin(client, auth_headers):
    """POST /api/problems - non-admin cannot create (403)."""
    response = await client.post(
        "/api/problems/",
        headers=auth_headers,
        json={
            "operation_type": "addition",
            "difficulty": "easy",
            "question": "2 + 2 = ?",
            "answer": 4,
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_problem_by_id(client, auth_headers, admin_auth_headers, db_session):
    """GET /api/problems/{id} - returns specific problem."""
    # Create a problem as admin
    problem = MathProblem(
        operation_type="multiplication",
        difficulty="medium",
        question="5 × 3 = ?",
        answer=15,
        created_by=1,
    )
    db_session.add(problem)
    await db_session.commit()
    await db_session.refresh(problem)

    response = await client.get(f"/api/problems/{problem.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == problem.id
    assert data["operation_type"] == "multiplication"


@pytest.mark.asyncio
async def test_get_problem_not_found(client, auth_headers):
    """GET /api/problems/{id} - non-existent returns 404."""
    response = await client.get("/api/problems/99999", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_problem_admin(client, admin_auth_headers, db_session):
    """DELETE /api/problems/{id} - admin can delete problem."""
    # Create a problem
    problem = MathProblem(
        operation_type="subtraction",
        difficulty="easy",
        question="8 - 3 = ?",
        answer=5,
        created_by=1,
    )
    db_session.add(problem)
    await db_session.commit()
    await db_session.refresh(problem)

    response = await client.delete(f"/api/problems/{problem.id}", headers=admin_auth_headers)
    assert response.status_code == 200
    assert "deleted" in response.json()["message"].lower()


@pytest.mark.asyncio
async def test_delete_problem_non_admin(client, auth_headers, db_session):
    """DELETE /api/problems/{id} - non-admin cannot delete (403)."""
    problem = MathProblem(
        operation_type="subtraction",
        difficulty="easy",
        question="8 - 3 = ?",
        answer=5,
        created_by=1,
    )
    db_session.add(problem)
    await db_session.commit()
    await db_session.refresh(problem)

    response = await client.delete(f"/api/problems/{problem.id}", headers=auth_headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_filter_problems_by_operation(client, auth_headers, db_session):
    """GET /api/problems?operation=addition - filter by operation."""
    # Create problems with different operations
    for op in ["addition", "subtraction", "multiplication"]:
        problem = MathProblem(
            operation_type=op,
            difficulty="easy",
            question=f"Test {op}",
            answer=1,
            created_by=1,
        )
        db_session.add(problem)
    await db_session.commit()

    response = await client.get("/api/problems/?operation=addition", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert all(p["operation_type"] == "addition" for p in data)


@pytest.mark.asyncio
async def test_filter_problems_by_difficulty(client, auth_headers, db_session):
    """GET /api/problems?difficulty=easy - filter by difficulty."""
    # Create problems with different difficulties
    for diff in ["easy", "medium", "hard"]:
        problem = MathProblem(
            operation_type="addition",
            difficulty=diff,
            question=f"Test {diff}",
            answer=1,
            created_by=1,
        )
        db_session.add(problem)
    await db_session.commit()

    response = await client.get("/api/problems/?difficulty=easy", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert all(p["difficulty"] == "easy" for p in data)
