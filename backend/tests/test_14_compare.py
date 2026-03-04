"""Tests for branch comparison endpoints (compare without PR).

Uses 'testbranch' (no slash) instead of 'feature/test-branch' to avoid
URL encoding issues with '/' in path parameters.
"""


def test_compare_stats(client, repo_id):
    resp = client.get(f"/api/repos/{repo_id}/compare/testbranch...main/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "files_changed" in data
    assert "insertions" in data
    assert "deletions" in data


def test_compare_files(client, repo_id):
    resp = client.get(f"/api/repos/{repo_id}/compare/testbranch...main/files")
    assert resp.status_code == 200
    files = resp.json()
    assert isinstance(files, list)
    assert len(files) >= 1
    for f in files:
        assert "path" in f
        assert "status" in f


def test_compare_commits(client, repo_id):
    resp = client.get(f"/api/repos/{repo_id}/compare/testbranch...main/commits")
    assert resp.status_code == 200
    commits = resp.json()
    assert isinstance(commits, list)


def test_compare_full_diff(client, repo_id):
    resp = client.get(f"/api/repos/{repo_id}/compare/testbranch...main/diff")
    assert resp.status_code == 200
    data = resp.json()
    assert "diff_text" in data


def test_compare_file_diff(client, repo_id):
    # Get files first
    files_resp = client.get(f"/api/repos/{repo_id}/compare/testbranch...main/files")
    files = files_resp.json()

    if len(files) > 0:
        path = files[0]["path"]
        resp = client.get(
            f"/api/repos/{repo_id}/compare/testbranch...main/diff/file",
            params={"path": path},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "diff_text" in data


def test_compare_same_branch(client, repo_id):
    """Comparing a branch to itself should return empty results."""
    resp = client.get(f"/api/repos/{repo_id}/compare/main...main/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["files_changed"] == 0
