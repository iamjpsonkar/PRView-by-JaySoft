"""
Shared fixtures for PRView test suite.

Creates a temporary git repo with branches and a test SQLite database
so tests can exercise all API endpoints without touching real data.
"""

import os
import shutil
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from git import Repo


# ---------------------------------------------------------------------------
# Temporary git repository fixture
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def git_repo_path():
    """Create a temporary git repo with two branches and a few commits."""
    tmp = tempfile.mkdtemp(prefix="prview_test_")
    repo = Repo.init(tmp)

    # Configure git user for commits
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()

    # Initial commit on main
    readme = os.path.join(tmp, "README.md")
    with open(readme, "w") as f:
        f.write("# Test Repo\n\nInitial content.\n")
    repo.index.add(["README.md"])
    repo.index.commit("Initial commit")

    # Create feature branch with changes
    repo.create_head("feature/test-branch")
    feature = repo.heads["feature/test-branch"]
    feature.checkout()

    # Add a new file
    hello = os.path.join(tmp, "hello.py")
    with open(hello, "w") as f:
        f.write('def hello():\n    return "Hello, world!"\n')
    repo.index.add(["hello.py"])
    repo.index.commit("Add hello.py")

    # Modify README
    with open(readme, "w") as f:
        f.write("# Test Repo\n\nUpdated content on feature branch.\n")
    repo.index.add(["README.md"])
    repo.index.commit("Update README on feature branch")

    # Create a simple branch (no slash in name) for compare tests
    repo.heads["main"].checkout()
    repo.create_head("testbranch", repo.heads["feature/test-branch"].commit)

    # Switch back to main
    repo.heads["main"].checkout()

    yield tmp

    # Cleanup
    shutil.rmtree(tmp, ignore_errors=True)


# ---------------------------------------------------------------------------
# Test database + FastAPI TestClient
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def test_db_path():
    """Create a temporary SQLite database file."""
    fd, path = tempfile.mkstemp(suffix=".db", prefix="prview_test_")
    os.close(fd)
    yield path
    os.unlink(path)


@pytest.fixture(scope="session")
def client(test_db_path, git_repo_path):
    """
    Provide a FastAPI TestClient wired to a temporary database.
    Patches the database module so the app uses our test DB.
    """
    db_url = f"sqlite:///{test_db_path}"

    # Patch database before importing app
    import app.database as db_module
    test_engine = create_engine(db_url, connect_args={"check_same_thread": False})
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    db_module.engine = test_engine
    db_module.SessionLocal = test_session

    # Also patch config so DATABASE_URL is consistent
    import app.config as cfg
    cfg.DATABASE_URL = db_url

    # Now import the app (which triggers router registration)
    from main import app, startup

    # Run startup to create tables, seed labels, run migrations
    startup()

    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# Helper: register the test repo and get its repo_id
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def repo_id(client, git_repo_path):
    """Register the temporary git repo and return its repo_id."""
    resp = client.post("/api/repos/select", json={"path": git_repo_path})
    assert resp.status_code == 200, f"Failed to register repo: {resp.text}"
    return resp.json()["repo_id"]


@pytest.fixture(scope="session")
def pr_id(client, repo_id):
    """Create a test PR and return its id. This fixture runs first (session-scoped)."""
    # Try to find existing PR first
    existing = client.get(f"/api/repos/{repo_id}/prs").json()
    for pr in existing:
        if pr["source_branch"] == "feature/test-branch" and pr["target_branch"] == "main":
            if pr["status"] in ("active", "draft"):
                return pr["id"]

    # Create one
    resp = client.post(f"/api/repos/{repo_id}/prs", json={
        "title": "Test PR",
        "description": "A test pull request",
        "source_branch": "feature/test-branch",
        "target_branch": "main",
        "status": "active",
    })
    assert resp.status_code == 201, f"Failed to create PR: {resp.text}"
    return resp.json()["id"]
