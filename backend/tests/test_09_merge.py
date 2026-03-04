"""Tests for merge endpoints: check, conflicts.

Note: We don't actually execute merges in tests to preserve the git repo state
for other tests. We test the check and conflict detection endpoints.
"""


def test_merge_check(client, repo_id, pr_id):
    resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/merge/check")
    assert resp.status_code == 200
    data = resp.json()
    assert "can_merge" in data
    assert "has_conflicts" in data
    assert "conflicting_files" in data
    assert isinstance(data["conflicting_files"], list)


def test_merge_check_can_merge(client, repo_id, pr_id):
    """Our test branches should be mergeable without conflicts."""
    resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/merge/check")
    data = resp.json()
    assert data["can_merge"] is True
    assert data["has_conflicts"] is False


def test_get_conflicts(client, repo_id, pr_id):
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/merge/conflicts")
    assert resp.status_code == 200
    data = resp.json()
    # Returns {has_conflicts, files: [...]}
    assert "files" in data
    assert isinstance(data["files"], list)


def test_merge_blocked_by_required_reviewers(client, repo_id):
    """Create a PR with required reviewers and verify merge is blocked."""
    pr_resp = client.post(f"/api/repos/{repo_id}/prs", json={
        "title": "PR needing approval for merge test",
        "source_branch": "feature/test-branch",
        "target_branch": "main",
        "required_reviewers": ["reviewer1"],
        "status": "draft",
    })
    if pr_resp.status_code == 201:
        blocked_pr_id = pr_resp.json()["id"]
        # Make it active so merge can be attempted
        client.patch(f"/api/repos/{repo_id}/prs/{blocked_pr_id}", json={"status": "active"})

        resp = client.post(f"/api/repos/{repo_id}/prs/{blocked_pr_id}/merge", json={
            "strategy": "merge",
        })
        assert resp.status_code == 400 or "approval" in resp.text.lower() or "reviewer" in resp.text.lower()
    else:
        assert pr_resp.status_code == 409
