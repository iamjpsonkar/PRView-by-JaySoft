"""Tests for review endpoints."""


def test_create_review(client, repo_id, pr_id):
    resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/reviews", json={
        "vote": "approved",
        "body": "Looks good to me",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["vote"] == "approved"
    assert data["body"] == "Looks good to me"
    assert data["reviewer"] == "local-user"


def test_create_review_reject(client, repo_id, pr_id):
    resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/reviews", json={
        "vote": "rejected",
        "body": "Needs changes",
    })
    assert resp.status_code == 201
    assert resp.json()["vote"] == "rejected"


def test_create_ai_review(client, repo_id, pr_id):
    resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/reviews", json={
        "vote": "approved_with_suggestions",
        "body": "AI review feedback",
        "is_ai_generated": True,
        "ai_agent_name": "review-bot",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["is_ai_generated"] is True
    assert data["ai_agent_name"] == "review-bot"


def test_list_reviews(client, repo_id, pr_id):
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/reviews")
    assert resp.status_code == 200
    reviews = resp.json()
    assert isinstance(reviews, list)
    assert len(reviews) >= 1
    for r in reviews:
        assert "id" in r
        assert "vote" in r
        assert "reviewer" in r
        assert "body" in r
        assert "is_ai_generated" in r


def test_review_summary_on_pr(client, repo_id, pr_id):
    pr = client.get(f"/api/repos/{repo_id}/prs/{pr_id}").json()
    assert "review_summary" in pr
    assert isinstance(pr["review_summary"], dict)


def test_custom_reviewer(client, repo_id, pr_id):
    resp = client.post(
        f"/api/repos/{repo_id}/prs/{pr_id}/reviews",
        json={"vote": "approved", "body": "Alice approves"},
        headers={"X-PRView-User": "alice"},
    )
    assert resp.status_code == 201
    assert resp.json()["reviewer"] == "alice"
