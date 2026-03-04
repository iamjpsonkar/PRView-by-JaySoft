"""Tests for repository endpoints: validate, select, recent, browse."""


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_validate_repo_valid(client, git_repo_path):
    resp = client.post("/api/repos/validate", json={"path": git_repo_path})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["name"] is not None
    assert data["branch_count"] >= 2


def test_validate_repo_invalid(client):
    resp = client.post("/api/repos/validate", json={"path": "/tmp/nonexistent_repo_xyz"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False


def test_select_repo(client, git_repo_path):
    resp = client.post("/api/repos/select", json={"path": git_repo_path})
    assert resp.status_code == 200
    data = resp.json()
    assert "repo_id" in data
    assert data["path"] == git_repo_path


def test_recent_repos(client, repo_id):
    resp = client.get("/api/repos/recent")
    assert resp.status_code == 200
    repos = resp.json()
    assert isinstance(repos, list)
    assert len(repos) >= 1
    assert any(r["id"] == repo_id for r in repos)


def test_browse_dirs(client):
    resp = client.get("/api/repos/browse", params={"path": "/tmp"})
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
