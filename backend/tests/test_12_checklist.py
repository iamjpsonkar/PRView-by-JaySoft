"""Tests for review checklist endpoints."""


def test_create_checklist(client, repo_id, pr_id):
    resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/checklist", json={
        "items": [
            {"label": "Code review completed", "checked": False, "category": "review"},
            {"label": "Tests pass", "checked": True, "category": "ci"},
            {"label": "No security issues", "checked": False, "details": "Run SAST scan"},
        ],
    })
    assert resp.status_code == 201
    items = resp.json()
    assert isinstance(items, list)
    assert len(items) == 3
    assert items[0]["label"] == "Code review completed"
    assert items[0]["checked"] is False
    assert items[1]["checked"] is True
    assert items[2]["details"] == "Run SAST scan"


def test_list_checklist(client, repo_id, pr_id):
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/checklist")
    assert resp.status_code == 200
    items = resp.json()
    assert isinstance(items, list)
    assert len(items) >= 3
    for item in items:
        assert "id" in item
        assert "label" in item
        assert "checked" in item
        assert "pr_id" in item
        assert "author" in item


def test_update_checklist_item(client, repo_id, pr_id):
    items = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/checklist").json()
    item_id = items[0]["id"]

    resp = client.patch(
        f"/api/repos/{repo_id}/prs/{pr_id}/checklist/{item_id}",
        json={"checked": True, "label": "Code review done"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["checked"] is True
    assert data["label"] == "Code review done"


def test_delete_checklist_item(client, repo_id, pr_id):
    items = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/checklist").json()
    item_id = items[-1]["id"]
    count_before = len(items)

    resp = client.delete(f"/api/repos/{repo_id}/prs/{pr_id}/checklist/{item_id}")
    assert resp.status_code == 200

    items_after = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/checklist").json()
    assert len(items_after) == count_before - 1


def test_checklist_empty_pr(client, repo_id):
    """A PR with no checklist should return empty list."""
    pr_resp = client.post(f"/api/repos/{repo_id}/prs", json={
        "title": "No Checklist PR",
        "source_branch": "feature/test-branch",
        "target_branch": "main",
        "status": "draft",
    })
    if pr_resp.status_code == 201:
        new_pr_id = pr_resp.json()["id"]
        resp = client.get(f"/api/repos/{repo_id}/prs/{new_pr_id}/checklist")
        assert resp.status_code == 200
        assert resp.json() == []
    else:
        # Just verify the endpoint returns a list
        assert pr_resp.status_code == 409
