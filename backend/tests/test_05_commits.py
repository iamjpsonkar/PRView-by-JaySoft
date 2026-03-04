"""Tests for commit endpoints."""


def test_list_commits(client, repo_id, pr_id):
    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/commits")
    assert resp.status_code == 200
    commits = resp.json()
    assert isinstance(commits, list)
    assert len(commits) >= 1
    for c in commits:
        assert "sha" in c
        assert "short_sha" in c
        assert "message" in c
        assert "author_name" in c
        assert "author_email" in c
        assert "authored_date" in c


def test_get_commit_diff(client, repo_id, pr_id):
    # Get a commit SHA
    commits = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/commits").json()
    sha = commits[0]["sha"]

    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/diff")
    assert resp.status_code == 200
    data = resp.json()
    assert "diff_text" in data


def test_get_commit_files(client, repo_id, pr_id):
    commits = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/commits").json()
    sha = commits[0]["sha"]

    resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/files")
    assert resp.status_code == 200
    files = resp.json()
    assert isinstance(files, list)
    assert len(files) >= 1


def test_get_commit_file_diff(client, repo_id, pr_id):
    commits = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/commits").json()
    sha = commits[0]["sha"]
    files = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/files").json()
    file_path = files[0]["path"]

    resp = client.get(
        f"/api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/diff/file",
        params={"path": file_path},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "diff_text" in data
