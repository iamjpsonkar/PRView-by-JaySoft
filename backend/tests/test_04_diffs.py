"""Tests for diff endpoints: files, file diff, stats, full diff, blame."""


def test_get_changed_files(client, repo_id, pr_id):
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/diff/files")
    assert resp.status_code == 200
    files = resp.json()
    assert isinstance(files, list)
    assert len(files) >= 1
    for f in files:
        assert "path" in f
        assert "status" in f
        assert "insertions" in f
        assert "deletions" in f


def test_get_file_diff(client, repo_id, pr_id):
    # Get files first
    files_resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/diff/files")
    files = files_resp.json()
    assert len(files) > 0

    path = files[0]["path"]
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/diff/file", params={"path": path})
    assert resp.status_code == 200
    data = resp.json()
    assert "diff_text" in data
    assert "path" in data


def test_get_diff_stats(client, repo_id, pr_id):
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/diff/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "files_changed" in data
    assert "insertions" in data
    assert "deletions" in data
    assert data["files_changed"] >= 1


def test_get_full_diff(client, repo_id, pr_id):
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/diff/full")
    assert resp.status_code == 200
    data = resp.json()
    assert "diff_text" in data
    assert len(data["diff_text"]) > 0


def test_get_blame(client, repo_id, pr_id):
    resp = client.get(
        f"/api/repos/{repo_id}/prs/{pr_id}/diff/blame",
        params={"path": "README.md"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # Blame returns {path, lines: [...]}
    assert "lines" in data
    assert isinstance(data["lines"], list)
    assert len(data["lines"]) > 0
    entry = data["lines"][0]
    assert "author" in entry
    assert "content" in entry
