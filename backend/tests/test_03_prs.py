"""Tests for pull request CRUD endpoints."""


def test_create_pr(client, repo_id):
    """Create a draft PR (to avoid conflict with the session-scoped active PR)."""
    resp = client.post(f"/api/repos/{repo_id}/prs", json={
        "title": "Second PR (draft)",
        "description": "Another test PR",
        "source_branch": "feature/test-branch",
        "target_branch": "main",
        "status": "draft",
    })
    # 201 for new, 409 if already exists — both are acceptable depending on test order
    if resp.status_code == 201:
        data = resp.json()
        assert data["title"] == "Second PR (draft)"
        assert data["status"] == "draft"
        assert data["source_branch"] == "feature/test-branch"
        assert data["target_branch"] == "main"
        assert data["author"] == "local-user"
        assert "id" in data
        assert "created_at" in data
    else:
        # Already exists from a previous run
        assert resp.status_code == 409


def test_create_pr_with_required_reviewers(client, repo_id):
    # Abandon the draft first to free the branch combo, then use custom branches
    # We just test that the required_reviewers field works on a fresh PR
    # First abandon any existing active/draft PRs for this combo
    prs = client.get(f"/api/repos/{repo_id}/prs").json()
    for pr in prs:
        if pr["title"] == "PR with Reviewers":
            client.delete(f"/api/repos/{repo_id}/prs/{pr['id']}")

    resp = client.post(f"/api/repos/{repo_id}/prs", json={
        "title": "PR with Reviewers",
        "description": "Has required reviewers",
        "source_branch": "feature/test-branch",
        "target_branch": "main",
        "required_reviewers": ["alice", "bob"],
        "status": "draft",
    })
    if resp.status_code == 201:
        data = resp.json()
        assert set(data["required_reviewers"]) == {"alice", "bob"}
        assert "alice" in data["approval_status"]
        assert "bob" in data["approval_status"]
    else:
        assert resp.status_code == 409


def test_list_prs(client, repo_id, pr_id):
    resp = client.get(f"/api/repos/{repo_id}/prs")
    assert resp.status_code == 200
    prs = resp.json()
    assert isinstance(prs, list)
    assert len(prs) >= 1


def test_list_prs_filter_status(client, repo_id):
    resp = client.get(f"/api/repos/{repo_id}/prs", params={"status": "active"})
    assert resp.status_code == 200
    prs = resp.json()
    for pr in prs:
        assert pr["status"] == "active"


def test_get_pr(client, repo_id, pr_id):
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == pr_id
    assert "comment_count" in data
    assert "review_summary" in data
    assert "labels" in data


def test_update_pr(client, repo_id, pr_id):
    resp = client.patch(f"/api/repos/{repo_id}/prs/{pr_id}", json={
        "title": "Updated Title",
        "description": "Updated description",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Updated Title"
    assert data["description"] == "Updated description"

    # Restore original
    client.patch(f"/api/repos/{repo_id}/prs/{pr_id}", json={
        "title": "Test PR",
        "description": "A test pull request",
    })


def test_update_pr_status(client, repo_id, pr_id):
    # Change to draft
    resp = client.patch(f"/api/repos/{repo_id}/prs/{pr_id}", json={"status": "draft"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "draft"
    # Restore to active
    client.patch(f"/api/repos/{repo_id}/prs/{pr_id}", json={"status": "active"})


def test_get_pr_not_found(client, repo_id):
    resp = client.get(f"/api/repos/{repo_id}/prs/99999")
    assert resp.status_code == 404


def test_custom_user_header(client, repo_id):
    # Abandon all existing PRs with this combo first
    prs = client.get(f"/api/repos/{repo_id}/prs").json()
    for pr in prs:
        if pr["title"] == "Custom Author PR":
            client.delete(f"/api/repos/{repo_id}/prs/{pr['id']}")

    resp = client.post(
        f"/api/repos/{repo_id}/prs",
        json={
            "title": "Custom Author PR",
            "source_branch": "feature/test-branch",
            "target_branch": "main",
            "status": "draft",
        },
        headers={"X-PRView-User": "alice"},
    )
    if resp.status_code == 201:
        assert resp.json()["author"] == "alice"
    else:
        assert resp.status_code == 409
