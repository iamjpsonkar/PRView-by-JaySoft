"""Tests for PR abandonment (DELETE endpoint)."""


def test_abandon_pr(client, repo_id):
    # Create a fresh PR to abandon — use status "active" but with unique title
    # to test the abandon flow. If can't create (409), find any non-abandoned PR.
    resp = client.post(f"/api/repos/{repo_id}/prs", json={
        "title": "PR to abandon",
        "source_branch": "testbranch",
        "target_branch": "main",
        "status": "active",
    })
    if resp.status_code == 201:
        abandon_pr_id = resp.json()["id"]
    else:
        # Find any active/draft PR we can abandon (not the main test PR)
        all_prs = client.get(f"/api/repos/{repo_id}/prs").json()
        candidates = [p for p in all_prs if p["status"] in ("active", "draft") and p["title"] != "Test PR"]
        assert len(candidates) > 0, "Need a PR to test abandon"
        abandon_pr_id = candidates[0]["id"]

    resp = client.delete(f"/api/repos/{repo_id}/prs/{abandon_pr_id}")
    assert resp.status_code == 200

    # Verify status changed to abandoned
    get_resp = client.get(f"/api/repos/{repo_id}/prs/{abandon_pr_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["status"] == "abandoned"
