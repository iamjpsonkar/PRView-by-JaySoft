"""Tests for branch listing endpoint."""


def test_list_branches(client, repo_id):
    resp = client.get(f"/api/repos/{repo_id}/branches")
    assert resp.status_code == 200
    branches = resp.json()
    assert isinstance(branches, list)
    assert len(branches) >= 2
    names = [b["name"] for b in branches]
    assert "main" in names
    assert "feature/test-branch" in names
    # Each branch should have required fields
    for b in branches:
        assert "name" in b
        assert "is_current" in b
        assert "commit_sha" in b
        assert "commit_message" in b
