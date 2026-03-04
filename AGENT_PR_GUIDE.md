# PRView — AI Agent Guide for PR Interaction

This document gives an AI agent everything it needs to interact with a PRView pull request via the REST API. PRView is a local code review tool running on `localhost`.

---

## Connecting to a PR

**PRView URL format:**
```
http://localhost:5121/repos/{repo_id}/prs/{pr_id}
http://localhost:5121/repos/{repo_id}/prs/{pr_id}/{tab}
```

**Extract from the URL:**
- `repo_id` — the repository identifier (e.g. `0d2a12a561f2`)
- `pr_id` — the pull request number (e.g. `2`)
- `tab` — optional: `overview`, `files`, `commits`, or `conflicts`

**API base URL:**
```
http://localhost:8121/api
```

All requests use JSON. Set header `Content-Type: application/json` for POST/PATCH requests.

---

## Quick Reference — Common Workflows

### 1. Get full PR context
```bash
# PR metadata
curl http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}

# Changed files with stats
curl http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/diff/files

# Aggregate diff stats
curl http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/diff/stats

# All commits
curl http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/commits

# All comments (threaded)
curl http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/comments

# All reviews
curl http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/reviews
```

### 2. Read a specific file's diff
```bash
curl "http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/diff/file?path=src/utils/parser.ts"
```

### 3. Read full unified diff
```bash
curl http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/diff/full
```

### 4. Add a comment on a specific line
```bash
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/comments \
  -H "Content-Type: application/json" \
  -d '{"body": "This could cause a null reference", "file_path": "src/main.ts", "line_number": 42, "line_type": "new"}'
```

### 5. Add a general PR comment
```bash
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/comments \
  -H "Content-Type: application/json" \
  -d '{"body": "Overall this looks good, just a few nits."}'
```

### 6. Reply to a comment
```bash
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/comments \
  -H "Content-Type: application/json" \
  -d '{"body": "Good point, I will fix this.", "parent_id": 5}'
```

### 7. Resolve a comment
```bash
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/comments/{comment_id}/resolve
```

### 8. Submit a review
```bash
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/reviews \
  -H "Content-Type: application/json" \
  -d '{"vote": "approved_with_suggestions", "body": "Looks good with minor suggestions."}'
```

### 9. Check for merge conflicts
```bash
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/merge/check
```

---

## Complete API Reference

### Get PR Detail

```
GET /api/repos/{repo_id}/prs/{pr_id}
```

**Response:**
```json
{
  "id": 2,
  "repo_id": "0d2a12a561f2",
  "title": "Add user authentication",
  "description": "Implements JWT-based auth flow",
  "source_branch": "feature/auth",
  "target_branch": "main",
  "status": "active",
  "merge_strategy": null,
  "author": "local-user",
  "created_at": "2025-06-01T10:30:00",
  "updated_at": "2025-06-02T14:20:00",
  "completed_at": null,
  "comment_count": 5,
  "review_summary": {
    "local-user": "approved"
  }
}
```

**Status values:** `draft`, `active`, `completed`, `abandoned`

---

### Update PR

```
PATCH /api/repos/{repo_id}/prs/{pr_id}
```

**Body** (all fields optional):
```json
{
  "title": "Updated title",
  "description": "Updated description with **markdown**",
  "status": "active"
}
```

---

### List Changed Files

```
GET /api/repos/{repo_id}/prs/{pr_id}/diff/files
```

**Response:**
```json
[
  {
    "path": "src/auth/login.ts",
    "status": "added",
    "insertions": 45,
    "deletions": 0,
    "old_path": null
  },
  {
    "path": "src/app.ts",
    "status": "modified",
    "insertions": 12,
    "deletions": 3,
    "old_path": null
  }
]
```

**Status values:** `added`, `modified`, `deleted`, `renamed`, `copied`

---

### Get Diff Stats

```
GET /api/repos/{repo_id}/prs/{pr_id}/diff/stats
```

**Response:**
```json
{
  "files_changed": 8,
  "insertions": 142,
  "deletions": 37
}
```

---

### Get Single File Diff

```
GET /api/repos/{repo_id}/prs/{pr_id}/diff/file?path={file_path}
```

**Response:**
```json
{
  "path": "src/auth/login.ts",
  "diff_text": "diff --git a/src/auth/login.ts b/src/auth/login.ts\n...",
  "status": "modified"
}
```

The `diff_text` is standard unified diff format.

---

### Get Full Diff

```
GET /api/repos/{repo_id}/prs/{pr_id}/diff/full
```

**Response:**
```json
{
  "diff_text": "diff --git a/file1.ts b/file1.ts\n..."
}
```

---

### List Commits

```
GET /api/repos/{repo_id}/prs/{pr_id}/commits
```

**Response:**
```json
[
  {
    "sha": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    "short_sha": "a1b2c3d",
    "message": "Add login endpoint with JWT support",
    "author_name": "John Doe",
    "author_email": "john@example.com",
    "authored_date": "2025-06-01T10:30:00+00:00",
    "files_changed": 3
  }
]
```

---

### Get Commit Diff

```
GET /api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/diff
```

**Response:**
```json
{
  "diff_text": "diff --git ..."
}
```

---

### Get Commit Changed Files

```
GET /api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/files
```

**Response:** Same shape as [List Changed Files](#list-changed-files).

---

### Get Commit File Diff

```
GET /api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/diff/file?path={file_path}
```

**Response:**
```json
{
  "path": "src/auth/login.ts",
  "diff_text": "diff --git ..."
}
```

---

### List Comments

```
GET /api/repos/{repo_id}/prs/{pr_id}/comments
```

Returns a **tree structure** — top-level comments with nested `replies`.

**Response:**
```json
[
  {
    "id": 1,
    "pr_id": 2,
    "parent_id": null,
    "file_path": "src/auth/login.ts",
    "line_number": 42,
    "line_type": "new",
    "body": "This should validate the token expiry",
    "author": "local-user",
    "status": "active",
    "created_at": "2025-06-01T12:00:00",
    "updated_at": "2025-06-01T12:00:00",
    "replies": [
      {
        "id": 3,
        "pr_id": 2,
        "parent_id": 1,
        "file_path": null,
        "line_number": null,
        "line_type": null,
        "body": "Good catch, fixed in latest commit",
        "author": "local-user",
        "status": "active",
        "created_at": "2025-06-01T13:00:00",
        "updated_at": "2025-06-01T13:00:00",
        "replies": []
      }
    ]
  },
  {
    "id": 2,
    "pr_id": 2,
    "parent_id": null,
    "file_path": null,
    "line_number": null,
    "line_type": null,
    "body": "Looks great overall!",
    "author": "local-user",
    "status": "active",
    "created_at": "2025-06-01T11:00:00",
    "updated_at": "2025-06-01T11:00:00",
    "replies": []
  }
]
```

**Comment types** (determined by which fields are set):
| Type | `file_path` | `line_number` | `parent_id` |
|------|-------------|---------------|-------------|
| General PR comment | `null` | `null` | `null` |
| File-level comment | `"path/to/file"` | `null` | `null` |
| Inline line comment | `"path/to/file"` | `42` | `null` |
| Reply to any comment | any | any | `{comment_id}` |

---

### Create Comment

```
POST /api/repos/{repo_id}/prs/{pr_id}/comments
```

**Body:**
```json
{
  "body": "Comment text (Markdown supported)",
  "file_path": "src/auth/login.ts",
  "line_number": 42,
  "line_type": "new",
  "parent_id": null
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `body` | string | Yes | Comment text. Supports Markdown. |
| `file_path` | string | No | File path for inline/file comments. `null` for general comments. |
| `line_number` | integer | No | Line number for inline comments. |
| `line_type` | string | No | `"new"` (added line), `"old"` (removed line), or `"context"`. |
| `parent_id` | integer | No | Parent comment ID to create a threaded reply. |

---

### Edit Comment

```
PATCH /api/repos/{repo_id}/prs/{pr_id}/comments/{comment_id}
```

**Body:**
```json
{
  "body": "Updated comment text"
}
```

---

### Delete Comment

```
DELETE /api/repos/{repo_id}/prs/{pr_id}/comments/{comment_id}
```

---

### Resolve / Reactivate Comment

Toggles between `active` and `resolved`.

```
POST /api/repos/{repo_id}/prs/{pr_id}/comments/{comment_id}/resolve
```

**Response:**
```json
{
  "status": "resolved"
}
```

---

### List Reviews

```
GET /api/repos/{repo_id}/prs/{pr_id}/reviews
```

**Response:**
```json
[
  {
    "id": 1,
    "pr_id": 2,
    "reviewer": "local-user",
    "vote": "approved",
    "body": "LGTM!",
    "created_at": "2025-06-01T14:00:00"
  }
]
```

---

### Submit Review

```
POST /api/repos/{repo_id}/prs/{pr_id}/reviews
```

**Body:**
```json
{
  "vote": "approved",
  "body": "Looks good to merge"
}
```

| `vote` value | Meaning |
|---|---|
| `approved` | Approve the PR |
| `approved_with_suggestions` | Approve but with minor suggestions |
| `wait_for_author` | Changes needed before approval |
| `rejected` | Reject the PR |

---

### Check Merge Conflicts

```
POST /api/repos/{repo_id}/prs/{pr_id}/merge/check
```

**Response:**
```json
{
  "can_merge": true,
  "has_conflicts": false,
  "conflicting_files": []
}
```

---

### Get Conflict Details

```
GET /api/repos/{repo_id}/prs/{pr_id}/merge/conflicts
```

**Response:**
```json
{
  "has_conflicts": true,
  "files": [
    {
      "path": "src/config.ts",
      "conflict_content": "<<<<<<< HEAD\nold line\n=======\nnew line\n>>>>>>> feature",
      "ours": "contents from target branch",
      "theirs": "contents from source branch",
      "base": "contents from common ancestor"
    }
  ]
}
```

---

### Execute Merge

```
POST /api/repos/{repo_id}/prs/{pr_id}/merge
```

**Body:**
```json
{
  "strategy": "squash",
  "commit_message": "feat: add user authentication (#2)",
  "delete_source_branch": false
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `strategy` | string | `"merge"` | `"merge"`, `"squash"`, or `"rebase"` |
| `commit_message` | string | auto | Custom commit message (mainly for squash) |
| `delete_source_branch` | bool | `false` | Delete source branch after merge |

**Response:**
```json
{
  "success": true,
  "message": "Merge completed successfully",
  "merge_commit": "a1b2c3d4e5f6..."
}
```

---

### Resolve Conflicts and Merge

```
POST /api/repos/{repo_id}/prs/{pr_id}/merge/resolve
```

**Body:**
```json
{
  "resolutions": {
    "src/config.ts": "// resolved content\nconst config = { ... };",
    "src/utils.ts": "// resolved content for second file"
  },
  "commit_message": "Merge with resolved conflicts"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resolutions` | object | Yes | Map of `file_path → resolved file content` |
| `commit_message` | string | No | Custom merge commit message |

---

### Abandon PR

```
DELETE /api/repos/{repo_id}/prs/{pr_id}
```

Sets the PR status to `abandoned`.

---

### List Branches

```
GET /api/repos/{repo_id}/branches
```

**Response:**
```json
[
  {
    "name": "main",
    "is_current": true,
    "commit_sha": "a1b2c3d4...",
    "commit_message": "Initial commit"
  },
  {
    "name": "feature/auth",
    "is_current": false,
    "commit_sha": "e5f6a7b8...",
    "commit_message": "Add login endpoint"
  }
]
```

---

## AI Agent Features

PRView has first-class support for AI agents. These features let agents identify themselves, work efficiently, and provide structured output.

### Agent Identity

Set the `X-PRView-User` header to identify the agent and `is_ai_generated` + `ai_agent_name` on comments and reviews:

```bash
# Comment with AI identity
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/comments \
  -H "Content-Type: application/json" \
  -H "X-PRView-User: my-bot" \
  -d '{"body": "Potential null reference here", "file_path": "src/main.ts", "line_number": 42, "is_ai_generated": true, "ai_agent_name": "my-bot"}'

# Review with AI identity
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/reviews \
  -H "Content-Type: application/json" \
  -d '{"vote": "approved_with_suggestions", "body": "Summary", "is_ai_generated": true, "ai_agent_name": "my-bot"}'
```

AI comments/reviews display with a special badge in the UI.

**Filter AI-only comments:**
```
GET /api/repos/{repo_id}/prs/{pr_id}/comments?ai_only=true
```

---

### Batch Comments

Submit multiple comments in a single request (much more efficient than N separate calls):

```bash
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/comments/batch \
  -H "Content-Type: application/json" \
  -d '{
    "comments": [
      {"body": "Issue 1", "file_path": "src/a.ts", "line_number": 10, "is_ai_generated": true, "ai_agent_name": "my-bot"},
      {"body": "Issue 2", "file_path": "src/b.ts", "line_number": 25, "is_ai_generated": true, "ai_agent_name": "my-bot"},
      {"body": "Overall feedback", "is_ai_generated": true, "ai_agent_name": "my-bot"}
    ]
  }'
```

**Response:**
```json
{
  "created": [ /* array of CommentResponse objects */ ],
  "errors": []
}
```

---

### Comment Suggestions

Attach code suggestions to inline comments:

```bash
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/comments \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Consider using a constant here",
    "file_path": "src/config.ts",
    "line_number": 15,
    "suggestion": "const MAX_RETRIES = 3;",
    "is_ai_generated": true,
    "ai_agent_name": "my-bot"
  }'
```

Users can apply suggestions directly from the UI. Check `suggestion_applied` (0 or 1) in the response.

---

### PR Context Endpoint (Single-Call)

Get everything about a PR in **one request** — ideal for LLM context windows:

```bash
# Get full context
curl "http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/context?include=diffs,comments,reviews,commits"

# Selective (only comments and reviews)
curl "http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/context?include=comments,reviews"

# Limit diff size
curl "http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/context?include=diffs,comments&max_diff_lines=500"
```

**Response:**
```json
{
  "pr": { /* full PRResponse object */ },
  "stats": {"files_changed": 5, "insertions": 120, "deletions": 30},
  "files": [ /* array of changed files */ ],
  "full_diff": "diff --git ...",
  "comments": [ /* threaded comment tree */ ],
  "reviews": [ /* review objects */ ],
  "commits": [ /* commit objects */ ]
}
```

**`include` values:** `diffs`, `comments`, `reviews`, `commits` (comma-separated). Defaults to all.

---

### PR Summary

Store and retrieve AI-generated summaries:

```bash
# Set summary
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/summary \
  -H "Content-Type: application/json" \
  -d '{"summary": "This PR adds JWT authentication with login/logout endpoints and middleware.", "agent_name": "my-bot"}'

# Get summary
curl http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/summary
```

**Response:**
```json
{
  "summary": "This PR adds JWT authentication...",
  "agent_name": "my-bot",
  "updated_at": "2025-06-01T14:00:00"
}
```

The summary also appears as `ai_summary` on the PR detail response and renders as a blue card in the UI.

---

### Review Checklist

Create structured assessment items:

```bash
# Create checklist
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/checklist \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"label": "No SQL injection risks", "checked": true, "category": "security"},
      {"label": "Error handling covers edge cases", "checked": false, "category": "quality", "details": "Missing try/catch in auth middleware"},
      {"label": "Tests added for new endpoints", "checked": true, "category": "testing"}
    ]
  }'

# List checklist
curl http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/checklist

# Toggle item
curl -X PATCH http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/checklist/{item_id} \
  -H "Content-Type: application/json" \
  -d '{"checked": true}'

# Delete item
curl -X DELETE http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/checklist/{item_id}
```

---

### Labels

Add labels to PRs for categorization:

```bash
# List available labels
curl http://localhost:8121/api/labels

# Add label to PR
curl -X POST http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/labels \
  -H "Content-Type: application/json" \
  -d '{"label_id": 2}'

# Remove label from PR
curl -X DELETE http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/labels/{label_id}

# Filter PRs by label
curl "http://localhost:8121/api/repos/{repo_id}/prs?label=bug"
```

Default labels: `bug`, `feature`, `breaking-change`, `WIP`, `docs`.

---

### Webhooks

Register URLs to receive HTTP POST notifications on events:

```bash
# Register webhook
curl -X POST http://localhost:8121/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://my-service.com/webhook", "events": ["pr.created", "comment.created"]}'

# List webhooks
curl http://localhost:8121/api/webhooks

# Delete webhook
curl -X DELETE http://localhost:8121/api/webhooks/{webhook_id}
```

**Available events:** `pr.created`, `pr.updated`, `pr.merged`, `comment.created`, `review.created`, `*` (all events).

**Webhook payload:**
```json
{
  "event": "comment.created",
  "timestamp": "2025-06-01T14:00:00",
  "pr_id": 2,
  "repo_id": "0d2a12a561f2",
  ...
}
```

---

### Branch Comparison (without PR)

Compare two branches before creating a PR:

```bash
# Stats
curl http://localhost:8121/api/repos/{repo_id}/compare/{source}...{target}/stats

# Changed files
curl http://localhost:8121/api/repos/{repo_id}/compare/{source}...{target}/files

# Full diff
curl http://localhost:8121/api/repos/{repo_id}/compare/{source}...{target}/diff

# Single file diff
curl "http://localhost:8121/api/repos/{repo_id}/compare/{source}...{target}/diff/file?path=src/main.ts"

# Commits between branches
curl http://localhost:8121/api/repos/{repo_id}/compare/{source}...{target}/commits
```

---

### Blame

Get per-line blame information for a file:

```bash
curl "http://localhost:8121/api/repos/{repo_id}/prs/{pr_id}/diff/blame?path=src/main.ts"
```

---

## Recommended Workflow for an AI Agent

### Optimized 5-Step Review (uses batch + context endpoints)

```
Step 1 — Get full PR context in ONE call
  GET /api/repos/{repo_id}/prs/{pr_id}/context?include=diffs,comments,reviews,commits

Step 2 — Analyze the diffs and leave all feedback at once
  POST /api/repos/{repo_id}/prs/{pr_id}/comments/batch
    → {"comments": [{...}, {...}, ...]}

Step 3 — Create a structured checklist
  POST /api/repos/{repo_id}/prs/{pr_id}/checklist
    → {"items": [{"label": "...", "checked": true/false, "category": "..."}, ...]}

Step 4 — Set an AI summary
  POST /api/repos/{repo_id}/prs/{pr_id}/summary
    → {"summary": "...", "agent_name": "my-bot"}

Step 5 — Submit review
  POST /api/repos/{repo_id}/prs/{pr_id}/reviews
    → {"vote": "approved_with_suggestions", "body": "...", "is_ai_generated": true, "ai_agent_name": "my-bot"}
```

This workflow requires only **5 API calls** to do a complete review (compared to 7+ with the traditional approach).

### Traditional Step-by-Step Review

```
Step 1 — Understand the PR
  GET /api/repos/{repo_id}/prs/{pr_id}                → Read title, description, branches, status
  GET /api/repos/{repo_id}/prs/{pr_id}/diff/stats      → Get scope (files changed, lines added/removed)
  GET /api/repos/{repo_id}/prs/{pr_id}/diff/files       → Get list of changed files

Step 2 — Read the code changes
  For each file (or the important ones):
    GET /api/repos/{repo_id}/prs/{pr_id}/diff/file?path={path}  → Read the unified diff

  Or read everything at once:
    GET /api/repos/{repo_id}/prs/{pr_id}/diff/full  → Full unified diff

Step 3 — Read existing feedback
  GET /api/repos/{repo_id}/prs/{pr_id}/comments   → See existing comments and threads
  GET /api/repos/{repo_id}/prs/{pr_id}/reviews     → See existing review votes

Step 4 — Leave feedback
  For each issue found:
    POST /api/repos/{repo_id}/prs/{pr_id}/comments
      → Inline comment: {"body": "...", "file_path": "...", "line_number": N, "line_type": "new"}
      → General comment: {"body": "..."}

Step 5 — Submit review
  POST /api/repos/{repo_id}/prs/{pr_id}/reviews
    → {"vote": "approved_with_suggestions", "body": "Summary of findings"}

Step 6 — Resolve addressed comments
  POST /api/repos/{repo_id}/prs/{pr_id}/comments/{id}/resolve
```

### Responding to comments on your PR

```
Step 1 — Read comments
  GET /api/repos/{repo_id}/prs/{pr_id}/comments

Step 2 — Reply to each comment
  POST /api/repos/{repo_id}/prs/{pr_id}/comments
    → {"body": "Fixed in latest commit", "parent_id": {comment_id}}

Step 3 — Resolve addressed comments
  POST /api/repos/{repo_id}/prs/{pr_id}/comments/{comment_id}/resolve
```

---

## Notes

- All timestamps are ISO 8601 format.
- The `diff_text` fields return standard unified diff format (same as `git diff`).
- Comments support **Markdown** in the `body` field.
- The API runs on port **8121**, the UI on port **5121**.
- The diff is computed against the **merge base** (common ancestor of source and target), not the target branch tip directly. This means only the PR's own changes are shown (same behavior as GitHub/Azure DevOps).
- Only one active/draft PR is allowed per source→target branch pair.
- Errors return `{"detail": "error message"}` with appropriate HTTP status codes (400, 404, 409).
- POST endpoints for creating resources return **201 Created**.
- Set `X-PRView-User` header to identify your agent (defaults to `"local-user"`).
