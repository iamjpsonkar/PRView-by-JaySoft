"""Tests for comment endpoints: CRUD, threads, batch, AI metadata, suggestions."""


class TestCommentCRUD:
    """Basic comment create, read, update, delete."""

    def test_create_comment(self, client, repo_id, pr_id):
        resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/comments", json={
            "body": "This is a test comment",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["body"] == "This is a test comment"
        assert data["author"] == "local-user"
        assert data["status"] == "active"
        assert data["pr_id"] == pr_id

    def test_create_inline_comment(self, client, repo_id, pr_id):
        resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/comments", json={
            "body": "Inline comment on README",
            "file_path": "README.md",
            "line_number": 1,
            "line_type": "addition",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["file_path"] == "README.md"
        assert data["line_number"] == 1
        assert data["line_type"] == "addition"

    def test_list_comments(self, client, repo_id, pr_id):
        resp = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/comments")
        assert resp.status_code == 200
        comments = resp.json()
        assert isinstance(comments, list)
        assert len(comments) >= 1

    def test_create_reply(self, client, repo_id, pr_id):
        # Get parent comment
        comments = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/comments").json()
        parent_id = comments[0]["id"]

        resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/comments", json={
            "body": "This is a reply",
            "parent_id": parent_id,
        })
        assert resp.status_code == 201
        assert resp.json()["parent_id"] == parent_id

        # Verify threaded structure
        comments = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/comments").json()
        parent = next(c for c in comments if c["id"] == parent_id)
        assert len(parent["replies"]) >= 1

    def test_update_comment(self, client, repo_id, pr_id):
        comments = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/comments").json()
        comment_id = comments[0]["id"]

        resp = client.patch(
            f"/api/repos/{repo_id}/prs/{pr_id}/comments/{comment_id}",
            json={"body": "Updated comment body"},
        )
        assert resp.status_code == 200
        assert resp.json()["body"] == "Updated comment body"

    def test_resolve_comment(self, client, repo_id, pr_id):
        comments = client.get(f"/api/repos/{repo_id}/prs/{pr_id}/comments").json()
        comment_id = comments[0]["id"]

        resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/comments/{comment_id}/resolve")
        assert resp.status_code == 200
        assert resp.json()["status"] == "resolved"

    def test_delete_comment(self, client, repo_id, pr_id):
        # Create a comment to delete
        create_resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/comments", json={
            "body": "To be deleted",
        })
        comment_id = create_resp.json()["id"]

        resp = client.delete(f"/api/repos/{repo_id}/prs/{pr_id}/comments/{comment_id}")
        assert resp.status_code == 200

    def test_comment_count_on_pr(self, client, repo_id, pr_id):
        pr = client.get(f"/api/repos/{repo_id}/prs/{pr_id}").json()
        assert pr["comment_count"] >= 1


class TestAIComments:
    """AI-generated comment metadata."""

    def test_create_ai_comment(self, client, repo_id, pr_id):
        resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/comments", json={
            "body": "AI generated feedback",
            "is_ai_generated": True,
            "ai_agent_name": "test-bot",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["is_ai_generated"] is True
        assert data["ai_agent_name"] == "test-bot"

    def test_filter_ai_comments(self, client, repo_id, pr_id):
        resp = client.get(
            f"/api/repos/{repo_id}/prs/{pr_id}/comments",
            params={"ai_only": True},
        )
        assert resp.status_code == 200
        comments = resp.json()
        # All returned should be AI-generated (check top-level)
        for c in comments:
            assert c["is_ai_generated"] is True


class TestBatchComments:
    """Batch comment creation endpoint."""

    def test_batch_create(self, client, repo_id, pr_id):
        resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/comments/batch", json={
            "comments": [
                {"body": "Batch comment 1"},
                {"body": "Batch comment 2", "file_path": "hello.py", "line_number": 1},
                {"body": "Batch comment 3", "is_ai_generated": True, "ai_agent_name": "batch-bot"},
            ],
        })
        assert resp.status_code == 201
        data = resp.json()
        assert len(data["created"]) == 3
        assert data["created"][2]["is_ai_generated"] is True

    def test_batch_empty(self, client, repo_id, pr_id):
        resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/comments/batch", json={
            "comments": [],
        })
        assert resp.status_code == 201
        assert len(resp.json()["created"]) == 0


class TestSuggestions:
    """Comment suggestion fields."""

    def test_create_comment_with_suggestion(self, client, repo_id, pr_id):
        resp = client.post(f"/api/repos/{repo_id}/prs/{pr_id}/comments", json={
            "body": "Consider this change",
            "suggestion": 'return "Hello, world!"',
            "file_path": "hello.py",
            "line_number": 2,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["suggestion"] == 'return "Hello, world!"'
        assert data["suggestion_applied"] == 0

    def test_custom_author_on_comment(self, client, repo_id, pr_id):
        resp = client.post(
            f"/api/repos/{repo_id}/prs/{pr_id}/comments",
            json={"body": "Comment from alice"},
            headers={"X-PRView-User": "alice"},
        )
        assert resp.status_code == 201
        assert resp.json()["author"] == "alice"
