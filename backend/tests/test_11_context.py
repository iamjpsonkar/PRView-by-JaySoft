"""Tests for PR context endpoint (LLM-optimized single-call data fetch)."""


def test_context_all_includes(client, repo_id, pr_id):
    resp = client.get(
        f"/api/repos/{repo_id}/prs/{pr_id}/context",
        params={"include": "diffs,comments,reviews,commits"},
    )
    assert resp.status_code == 200
    data = resp.json()

    # PR metadata is nested under "pr"
    assert "pr" in data
    assert data["pr"]["id"] == pr_id
    assert "title" in data["pr"]
    assert "description" in data["pr"]

    # Stats
    assert "stats" in data

    # Diffs
    assert "files" in data
    assert "full_diff" in data

    # Comments
    assert "comments" in data
    assert isinstance(data["comments"], list)

    # Reviews
    assert "reviews" in data
    assert isinstance(data["reviews"], list)

    # Commits
    assert "commits" in data
    assert isinstance(data["commits"], list)


def test_context_selective_include(client, repo_id, pr_id):
    """Only request comments, not diffs/reviews/commits."""
    resp = client.get(
        f"/api/repos/{repo_id}/prs/{pr_id}/context",
        params={"include": "comments"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "comments" in data
    # Fields not requested should be absent
    assert "commits" not in data
    assert "reviews" not in data


def test_context_default_includes(client, repo_id, pr_id):
    """Without include param, defaults to everything."""
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/context")
    assert resp.status_code == 200
    data = resp.json()
    assert "pr" in data
    assert "stats" in data
    assert "comments" in data
    assert "reviews" in data
    assert "commits" in data


def test_context_max_diff_lines(client, repo_id, pr_id):
    resp = client.get(
        f"/api/repos/{repo_id}/prs/{pr_id}/context",
        params={"include": "diffs", "max_diff_lines": 5},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "full_diff" in data
