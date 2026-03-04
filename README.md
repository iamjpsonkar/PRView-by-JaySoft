# PRView

A fully-featured, local-first pull request review tool that replicates the Azure DevOps Pull Request experience — running entirely on `localhost`. Browse diffs, comment on code, review, resolve conflicts, and merge branches, all without leaving your machine.

> **GitHub:** [https://github.com/iamjpsonkar/PRView-by-JaySoft](https://github.com/iamjpsonkar/PRView-by-JaySoft)

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Manual Start](#manual-start)
- [Architecture](#architecture)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Database Schema](#database-schema)
  - [API Reference](#api-reference)
- [Usage Guide](#usage-guide)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

### Repository Management
- Browse filesystem to find git repositories
- Validate and select local git repos
- Recently opened repos for quick access

### Pull Request Lifecycle
- **Create** PRs between any two branches (with duplicate prevention)
- **Edit** title and description inline (Markdown supported)
- **Filter** by status: Active, Draft, Completed, Abandoned
- **Search** by title, branch, author, or PR number
- **Abandon** and **reactivate** PRs

### Diff Viewing
- **4 view modes**: Inline, Side-by-Side, Existing (target branch only), Modified (source branch with red/green highlights)
- Synchronized scrolling in side-by-side mode
- File tree sidebar showing all changed files with `+/-` stats
- Syntax highlighting via [diff2html](https://github.com/rtfpessoa/diff2html)
- **Sticky file toolbar** — file name and view toggle stay pinned while scrolling diffs
- Sticky file headers
- Per-file and overall diff statistics
- Rename and binary file detection

### Code Comments
- Click any line gutter to add **inline comments**
- File-level and PR-level **general comments**
- **Threaded replies** with nesting
- **Resolve / reactivate** comment threads
- **Markdown** rendering in all comments

### Code Reviews
- Vote: **Approve**, **Approve with suggestions**, **Wait for author**, **Reject**
- Optional review body with each vote
- Review history displayed on PR overview
- Aggregated review status badges on PR header

### Commit History
- List all commits between source and target branches
- **Accordion view** — expand/collapse individual commits inline to see their diffs
- Multiple commits can be expanded simultaneously
- Per-commit file chip bar for quick file selection
- Copy commit SHA to clipboard

### Merge Operations
- **Merge commit** (no fast-forward)
- **Squash merge** with custom commit message
- **Rebase**
- Pre-merge **conflict detection**
- **Conflict resolution UI** with 3-way merge display (ours / theirs / base)
- Manual resolution editor with "Accept Ours" / "Accept Theirs" shortcuts
- Auto-delete source branch option

### UI/UX
- **Dark / Light** theme toggle (persisted)
- Activity timeline on PR overview
- Keyboard shortcuts for navigation
- Markdown rendering for descriptions and comments
- Responsive layout

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Python 3.12 + FastAPI | Async REST API server |
| **Git Operations** | GitPython | Branch diffs, merge, conflict detection |
| **Database** | SQLite + SQLAlchemy | PR metadata, comments, reviews |
| **Frontend** | React 19 + TypeScript | Single-page application |
| **Build Tool** | Vite | Dev server with HMR & production builds |
| **Diff Rendering** | diff2html | Side-by-side & inline diffs with syntax highlighting |
| **Markdown** | react-markdown + remark-gfm | GitHub-flavored Markdown rendering |
| **State Management** | Zustand | Lightweight stores for theme, repo, and PR state |
| **Styling** | Tailwind CSS + Inline styles | UI styling |
| **Server** | Uvicorn | ASGI server with hot reload |

---

## Project Structure

```
PRView/
├── run.sh                          # One-command startup script
├── test.sh                         # Test suite runner (83 tests)
│
├── backend/                        # Python FastAPI backend
│   ├── main.py                     # App entry point, CORS, route registration
│   ├── requirements.txt            # Python dependencies
│   ├── prview.db                   # SQLite database (auto-created)
│   └── app/
│       ├── config.py               # Port & database configuration
│       ├── database.py             # SQLAlchemy engine & session
│       ├── models.py               # ORM models (Repository, PullRequest, Comment, Review)
│       ├── schemas.py              # Pydantic request/response schemas
│       ├── routes/
│       │   ├── repos.py            # Repo validation, selection, browsing
│       │   ├── branches.py         # Branch listing
│       │   ├── prs.py              # PR CRUD operations
│       │   ├── diffs.py            # Diff generation (files, stats, full)
│       │   ├── commits.py          # Commit history & per-commit diffs
│       │   ├── comments.py         # Comment CRUD, threading, resolution, batch
│       │   ├── reviews.py          # Review voting
│       │   ├── merge.py            # Merge execution, conflict detection & resolution
│       │   ├── labels.py           # Label CRUD, PR label assignment
│       │   ├── compare.py          # Branch comparison without PR
│       │   ├── webhooks.py         # Webhook registration & events
│       │   └── checklist.py        # Review checklist items
│       ├── services/
│       │   └── git_service.py      # GitPython wrapper (18 methods)
│       └── utils/
│
├── frontend/                       # React + TypeScript + Vite
│   ├── package.json
│   ├── vite.config.ts              # Dev server (port 5121), API proxy
│   ├── tsconfig.json               # Strict TypeScript config
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx                # React root with BrowserRouter
│       ├── App.tsx                 # Route definitions
│       ├── api/
│       │   └── client.ts           # Fetch-based API client with error handling
│       ├── pages/
│       │   ├── RepoSelectPage.tsx  # Home — repo browser & selection
│       │   ├── PRListPage.tsx      # PR listing with search & filters
│       │   └── PRDetailPage.tsx    # PR detail (overview, files, commits, conflicts)
│       ├── stores/
│       │   ├── repo.store.ts       # Current repo state
│       │   ├── pr.store.ts         # Diff view mode preference
│       │   └── settings.store.ts    # Display name, diff mode, theme (persisted)
│       ├── utils/
│       │   ├── diffFilter.ts       # Existing/Modified diff side extraction
│       │   └── exportPR.ts         # PR export utilities
│       └── styles/
│           └── globals.css         # Theme variables, markdown styles, dark mode
│
└── .gitignore
```

---

## Getting Started

### Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- **Git** (the repos you want to review must be local)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/iamjpsonkar/PRView-by-JaySoft.git PRView
cd PRView

# Run everything with one command
chmod +x run.sh
./run.sh
```

The script will:
1. Free ports `8121` (backend) and `5121` (frontend) if in use
2. Create a Python virtual environment and install dependencies
3. Install frontend dependencies
4. Start both servers
5. Open `http://localhost:5121` in your browser

### Manual Start

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8121 --reload
```

**Frontend** (in a separate terminal):
```bash
cd frontend
npm install
npx vite --port 5121
```

Open **http://localhost:5121** in your browser.

---

## Architecture

### Backend

The backend is a **FastAPI** application serving a REST API on port **8121**.

**Route Modules** (12 files):

| Module | Prefix | Responsibility |
|--------|--------|---------------|
| `repos.py` | `/api/repos` | Validate, select, browse repositories |
| `branches.py` | `/api/repos/{repo_id}` | List branches |
| `prs.py` | `/api/repos/{repo_id}/prs` | PR CRUD with duplicate prevention |
| `diffs.py` | `/api/repos/{repo_id}/prs/{pr_id}/diff` | File diffs, stats, blame |
| `commits.py` | `/api/repos/{repo_id}/prs/{pr_id}/commits` | Commit history & diffs |
| `comments.py` | `/api/repos/{repo_id}/prs/{pr_id}/comments` | Threaded comments, batch, suggestions |
| `reviews.py` | `/api/repos/{repo_id}/prs/{pr_id}/reviews` | Review voting |
| `merge.py` | `/api/repos/{repo_id}/prs/{pr_id}/merge` | Merge, conflicts |
| `labels.py` | `/api/labels` | Label CRUD, PR label assignment |
| `compare.py` | `/api/repos/{repo_id}/compare` | Branch comparison without PR |
| `webhooks.py` | `/api/webhooks` | Webhook registration & events |
| `checklist.py` | `/api/repos/{repo_id}/prs/{pr_id}/checklist` | Review checklist items |

**Git Service** (`git_service.py`) wraps GitPython with 18 methods:
- Uses `git merge-base` for accurate diffs (only shows PR changes, like Azure DevOps)
- Handles initial commits via empty tree hash fallback
- Conflict detection via `git merge-tree` with fallback to trial merge
- Conflict resolution: trial merge → read working tree → apply resolutions → commit

### Frontend

The frontend is a **React 19 + TypeScript** SPA built with **Vite**.

**Pages:**

| Route | Page | Description |
|-------|------|-------------|
| `/` | `RepoSelectPage` | Repository browser and selection |
| `/repos/:repoId/prs` | `PRListPage` | PR listing with search and filters |
| `/repos/:repoId/prs/:prId[/:tab]` | `PRDetailPage` | PR detail with 4 tabs |
| `/repos/:repoId/compare/:branches` | `ComparePage` | Branch comparison diff viewer |
| `/settings` | `SettingsPage` | Display name, diff mode, merge strategy, theme |

**PR Detail Tabs:**

| Tab | Features |
|-----|----------|
| **Overview** | Description (Markdown), activity timeline, general comments, review sidebar, merge/abandon actions |
| **Files** | File tree + diff viewer (4 modes), sticky toolbar, inline commenting, comment badges |
| **Commits** | Accordion commit list with inline diffs, multi-expand, file chip bar |
| **Conflicts** | 3-way merge display, resolution editor, accept ours/theirs buttons |

**Stores (Zustand):**

| Store | State | Persistence |
|-------|-------|-------------|
| `repo.store` | Current repo ID, name, path | Memory |
| `pr.store` | Diff view mode (inline/side-by-side/existing/modified) | Memory |
| `theme.store` | Dark/light theme | `localStorage` |

### Database Schema

```
┌─────────────────┐
│   Repository     │
├─────────────────┤       ┌──────────────────┐
│ id (PK)         │──────→│   PullRequest     │
│ path            │       ├──────────────────┤       ┌──────────────────┐
│ name            │       │ id (PK)          │──────→│   Comment         │
│ last_opened     │       │ repo_id (FK)     │       ├──────────────────┤
│ created_at      │       │ title            │       │ id (PK)          │
└─────────────────┘       │ description      │       │ pr_id (FK)       │
                          │ source_branch    │       │ parent_id        │──→ (self)
                          │ target_branch    │       │ file_path        │
                          │ status           │       │ line_number      │
                          │ merge_strategy   │       │ line_type        │
                          │ author           │       │ body             │
                          │ ai_summary       │       │ suggestion       │
                          │ ai_summary_agent │       │ suggestion_applied│
                          │ created_at       │       │ author           │
                          │ updated_at       │       │ status           │
                          │ completed_at     │       │ is_ai_generated  │
                          └──────────────────┤       │ ai_agent_name    │
                                             │       │ created_at       │
                                             │       │ updated_at       │
                                             │       └──────────────────┘
                                             │
                                             │       ┌──────────────────┐
                                             ├──────→│   Review          │
                                             │       ├──────────────────┤
                                             │       │ id (PK)          │
                                             │       │ pr_id (FK)       │
                                             │       │ reviewer         │
                                             │       │ vote             │
                                             │       │ body             │
                                             │       │ is_ai_generated  │
                                             │       │ ai_agent_name    │
                                             │       │ created_at       │
                                             │       └──────────────────┘
                                             │
                                             │       ┌──────────────────┐
                                             └──────→│   ChecklistItem   │
                                                     ├──────────────────┤
                                                     │ id (PK)          │
                                                     │ pr_id (FK)       │
                                                     │ label            │
                                                     │ checked          │
                                                     │ category         │
                                                     │ details          │
                                                     │ created_at       │
                                                     └──────────────────┘

┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Label      │     │   PRLabel (M2M)   │     │   Webhook        │
├─────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)     │     │ pr_id (FK)       │     │ id (PK)          │
│ name        │     │ label_id (FK)    │     │ url              │
│ color       │     └──────────────────┘     │ events           │
│ description │                               │ created_at       │
└─────────────┘                               └──────────────────┘
```

**PR Status:** `draft` | `active` | `completed` | `abandoned`

**Review Votes:** `approved` | `approved_with_suggestions` | `wait_for_author` | `rejected`

**Comment Status:** `active` | `resolved`

### API Reference

#### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |

#### Repositories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/repos/validate` | Validate a git repo path |
| `POST` | `/api/repos/select` | Select repo, returns `repo_id` |
| `GET` | `/api/repos/recent` | Last 10 opened repos |
| `GET` | `/api/repos/browse?path=` | Browse filesystem directories |

#### Branches

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos/{repo_id}/branches` | List all branches |

#### Pull Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos/{repo_id}/prs?status=` | List PRs (optional status filter) |
| `POST` | `/api/repos/{repo_id}/prs` | Create PR (duplicate check enforced) |
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}` | Get PR detail with counts |
| `PATCH` | `/api/repos/{repo_id}/prs/{pr_id}` | Update title, description, or status |
| `DELETE` | `/api/repos/{repo_id}/prs/{pr_id}` | Abandon PR |

#### Diffs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/diff/files` | Changed files with stats |
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/diff/file?path=` | Single file diff |
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/diff/stats` | Aggregate diff stats |
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/diff/full` | Full unified diff |

#### Commits

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/commits` | List commits between branches |
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/diff` | Commit diff |
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/files` | Commit changed files |
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/commits/{sha}/diff/file?path=` | File diff in commit |

#### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/comments` | List comments (tree structure) |
| `POST` | `/api/repos/{repo_id}/prs/{pr_id}/comments` | Create comment (inline, file, or general) |
| `PATCH` | `/api/repos/{repo_id}/prs/{pr_id}/comments/{id}` | Edit comment body |
| `DELETE` | `/api/repos/{repo_id}/prs/{pr_id}/comments/{id}` | Delete comment |
| `POST` | `/api/repos/{repo_id}/prs/{pr_id}/comments/{id}/resolve` | Toggle resolved/active |

#### Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/reviews` | List reviews |
| `POST` | `/api/repos/{repo_id}/prs/{pr_id}/reviews` | Submit review with vote |

#### Merge

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/repos/{repo_id}/prs/{pr_id}/merge/check` | Pre-merge conflict check |
| `POST` | `/api/repos/{repo_id}/prs/{pr_id}/merge` | Execute merge (merge/squash/rebase) |
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/merge/conflicts` | Detailed conflict info (ours/theirs/base) |
| `POST` | `/api/repos/{repo_id}/prs/{pr_id}/merge/resolve` | Apply conflict resolutions |

#### Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/labels` | List all labels |
| `POST` | `/api/labels` | Create label |
| `DELETE` | `/api/labels/{label_id}` | Delete label |
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/labels` | List PR labels |
| `POST` | `/api/repos/{repo_id}/prs/{pr_id}/labels` | Add label to PR |
| `DELETE` | `/api/repos/{repo_id}/prs/{pr_id}/labels/{label_id}` | Remove label from PR |

#### AI Agent Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos/{repo_id}/prs/{pr_id}/context` | Full PR context (single call) |
| `POST` | `/api/repos/{repo_id}/prs/{pr_id}/comments/batch` | Batch create comments |
| `GET/POST` | `/api/repos/{repo_id}/prs/{pr_id}/summary` | Get/set AI summary |
| `GET/POST` | `/api/repos/{repo_id}/prs/{pr_id}/checklist` | Get/create checklist items |
| `PATCH` | `/api/repos/{repo_id}/prs/{pr_id}/checklist/{id}` | Update checklist item |
| `DELETE` | `/api/repos/{repo_id}/prs/{pr_id}/checklist/{id}` | Delete checklist item |

#### Branch Comparison

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/repos/{repo_id}/compare/{src}...{tgt}/stats` | Compare stats |
| `GET` | `/api/repos/{repo_id}/compare/{src}...{tgt}/files` | Compare changed files |
| `GET` | `/api/repos/{repo_id}/compare/{src}...{tgt}/diff` | Compare full diff |
| `GET` | `/api/repos/{repo_id}/compare/{src}...{tgt}/commits` | Compare commits |

#### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/webhooks` | List webhooks |
| `POST` | `/api/webhooks` | Register webhook |
| `DELETE` | `/api/webhooks/{webhook_id}` | Delete webhook |

---

## Usage Guide

### 1. Select a Repository
- Open `http://localhost:5121`
- Enter the path to a local git repository, or click **Browse** to navigate
- Click **Validate**, then **Open Repository**

### 2. Create a Pull Request
- Click **+ New Pull Request**
- Select source branch (your feature branch) and target branch (e.g., `main`)
- Add a title and description (Markdown supported)
- Optionally mark as draft

### 3. Review Code
- Navigate to the **Files** tab to see all changed files
- Choose from **4 diff view modes**:
  - **Inline** — unified diff
  - **Side by Side** — old and new side by side with synchronized scrolling
  - **Existing** — target branch code only (plain, no highlighting)
  - **Modified** — source branch code with red/green change highlights
- The file toolbar stays pinned while scrolling long diffs
- Click the `+` button on any line gutter to add an inline comment
- Use the file tree sidebar to jump between files

### 4. Submit a Review
- Click **Submit Review** on the Overview tab
- Choose a vote: Approve, Approve with suggestions, Wait for author, or Reject
- Add an optional comment

### 5. View Commits
- Go to the **Commits** tab
- Click any commit to expand its diff inline (accordion style)
- Multiple commits can be expanded simultaneously
- Use the file chip bar within each expanded commit to filter by file
- Click an expanded commit again to collapse it

### 6. Resolve Conflicts
- If conflicts are detected, a badge appears on the **Conflicts** tab
- View the 3-way merge: ours (target), theirs (source), and base versions
- Use **Accept Ours** or **Accept Theirs**, or manually edit the resolution
- Click **Complete Merge with Resolutions** when all conflicts are resolved

### 7. Merge
- Click **Complete Merge** on the Overview tab
- Choose a strategy: Merge commit, Squash, or Rebase
- Optionally delete the source branch after merging

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Overview tab |
| `2` | Switch to Files tab |
| `3` | Switch to Commits tab |
| `4` | Switch to Conflicts tab |
| `j` | Next file (Files tab) |
| `k` | Previous file (Files tab) |
| `a` | Show all files (Files tab) |
| `Cmd/Ctrl + Enter` | Submit inline comment |
| `Escape` | Cancel inline comment |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PRVIEW_PORT` | `8121` | Backend API port |
| Frontend port | `5121` | Set in `run.sh` and `vite.config.ts` |
| Database | `backend/prview.db` | SQLite database (auto-created) |
| CORS origin | `http://localhost:5121` | Allowed frontend origin |

---

## Troubleshooting

### Blank page on PR detail
Ensure you're running the latest code. A React Rules of Hooks violation was fixed where a `useEffect` was placed after an early return statement.

### Port already in use
The `run.sh` script automatically frees ports 8121 and 5121. To do it manually:
```bash
lsof -ti :8121 | xargs kill -9
lsof -ti :5121 | xargs kill -9
```

### Database issues
Delete `backend/prview.db` and restart — it will be recreated automatically.

### Git operations fail
Ensure the selected repository is a valid git repo with at least one commit. Both source and target branches must exist.

---

## Testing

Run the full test suite (83 tests across 15 test files):

```bash
bash test.sh
```

Tests cover all API endpoints: repos, branches, PRs, diffs, commits, comments, reviews, labels, merge, summary, context, checklist, webhooks, compare, and abandon.

---

## License

MIT

---

Built with FastAPI, React, GitPython, and diff2html.
