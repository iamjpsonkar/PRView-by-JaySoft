# PRView — Developer Context for AI Agents

> Local-first pull request review tool. Replicates Azure DevOps PR experience on localhost.
> Read this file to understand the full codebase before building new features.

## Quick Start

```bash
bash run.sh          # Start both servers, opens browser
bash test.sh         # Run 83 backend tests (pytest)
cd frontend && ./node_modules/.bin/tsc --noEmit  # TypeScript check
```

| Service  | Port | Tech |
|----------|------|------|
| Backend  | 8121 | Python 3.12, FastAPI, SQLAlchemy, GitPython, SQLite |
| Frontend | 5121 | React 19, TypeScript, Vite, Zustand, diff2html |

Frontend proxies `/api/*` to `http://localhost:8121` via Vite config.

---

## Directory Structure

```
PRView/
├── CLAUDE.md                          # This file (developer context)
├── AGENT_PR_GUIDE.md                  # API usage guide for PR review bots
├── README.md                          # User-facing documentation
├── run.sh                             # One-command startup (backend + frontend)
├── test.sh                            # Test runner (auto-detects venv)
│
├── backend/
│   ├── main.py                        # FastAPI app, CORS, startup events, route registration
│   ├── requirements.txt               # Python dependencies
│   ├── prview.db                      # SQLite database (auto-created)
│   ├── app/
│   │   ├── config.py                  # BASE_DIR, DATABASE_URL, SERVER_PORT
│   │   ├── database.py                # Engine, SessionLocal, get_db(), init_db()
│   │   ├── models.py                  # 8 SQLAlchemy models
│   │   ├── schemas.py                 # All Pydantic request/response schemas
│   │   ├── dependencies.py            # get_current_user() from X-PRView-User header
│   │   ├── routes/
│   │   │   ├── repos.py               # Repository validation, selection, browsing
│   │   │   ├── branches.py            # Branch listing with search/limit
│   │   │   ├── prs.py                 # PR CRUD, summary, context endpoint
│   │   │   ├── diffs.py               # Diff files, stats, full diff, blame
│   │   │   ├── commits.py             # Commit listing and diffs
│   │   │   ├── comments.py            # Comments CRUD, batch, suggestions, resolve
│   │   │   ├── reviews.py             # Review creation and listing
│   │   │   ├── merge.py               # Merge check, execute, conflict resolution
│   │   │   ├── labels.py              # Label CRUD, PR label assignment
│   │   │   ├── compare.py             # Ad-hoc branch comparison (no PR needed)
│   │   │   ├── webhooks.py            # Webhook registration and management
│   │   │   └── checklist.py           # Checklist items CRUD
│   │   └── services/
│   │       ├── git_service.py         # All git operations (GitPython wrapper)
│   │       └── webhook_service.py     # Async webhook firing
│   └── tests/                         # 15 test files, 83 tests (pytest)
│       ├── conftest.py                # Fixtures: client, git_repo, repo_id, pr_id
│       ├── test_01_repos.py           # Repo validation, selection, browsing
│       ├── test_02_branches.py        # Branch listing
│       ├── test_03_prs.py             # PR CRUD
│       ├── test_04_diffs.py           # Diff retrieval, blame
│       ├── test_05_commits.py         # Commit listing and diffs
│       ├── test_06_comments.py        # Comments, batch, suggestions
│       ├── test_07_reviews.py         # Reviews
│       ├── test_08_labels.py          # Labels
│       ├── test_09_merge.py           # Merge operations
│       ├── test_10_summary.py         # AI summary
│       ├── test_11_context.py         # Context endpoint
│       ├── test_12_checklist.py       # Checklist
│       ├── test_13_webhooks.py        # Webhooks
│       ├── test_14_compare.py         # Branch comparison
│       └── test_15_abandon.py         # PR abandonment
│
└── frontend/
    ├── vite.config.ts                 # Port 5121, proxy /api → :8121, alias @/ → ./src/
    ├── package.json                   # React 19, Zustand 5, diff2html 3, React Router 6
    ├── tsconfig.json                  # Strict TypeScript config
    ├── index.html                     # Entry HTML
    └── src/
        ├── main.tsx                   # BrowserRouter + ToastProvider wrapper
        ├── App.tsx                    # All routes defined here
        ├── types.ts                   # All shared TypeScript interfaces
        ├── api/
        │   └── client.ts             # API client: api.get/post/patch/delete
        ├── stores/
        │   ├── settings.store.ts      # Display name, diff mode, merge strategy, theme (persisted)
        │   ├── repo.store.ts          # Current repo context (repoId, name, path)
        │   ├── pr.store.ts            # Per-session diff view mode
        │   ├── theme.store.ts         # Dark/light toggle (localStorage)
        │   └── fileReview.store.ts    # Tracks reviewed files per PR (persisted)
        ├── pages/
        │   ├── RepoSelectPage.tsx     # Repo selection with file browser
        │   ├── PRListPage.tsx         # PR list with filters, search, create modal
        │   ├── PRDetailPage.tsx       # Main PR view (4 tabs: overview/files/commits/conflicts)
        │   ├── ComparePage.tsx        # Ad-hoc branch comparison
        │   └── SettingsPage.tsx       # User preferences
        ├── components/
        │   ├── layout/
        │   │   ├── Header.tsx         # Blue nav bar with breadcrumbs, theme toggle, settings
        │   │   ├── Modal.tsx          # Centered overlay modal
        │   │   ├── Avatar.tsx         # Colored circle with initials (deterministic color)
        │   │   ├── ToastProvider.tsx   # Toast notification system (success/error/info/warning)
        │   │   └── ShortcutHelpModal.tsx  # Keyboard shortcut reference
        │   ├── pr/
        │   │   ├── FileTree.tsx       # Collapsible folder tree for changed files
        │   │   ├── CommentBlock.tsx   # Comment with replies, resolve, delete, AI badge
        │   │   ├── LabelBadge.tsx     # Colored label chip with optional remove
        │   │   └── MarkdownEditor.tsx # Write/Preview/Split markdown editor
        │   └── diff/
        │       └── DiffToolbar.tsx    # Title + 4 diff mode buttons
        └── utils/
            ├── diffFilter.ts          # filterDiffSide() for existing/modified view modes
            └── exportPR.ts            # Export PR as markdown file download

```

---

## Backend: Database Models

**File:** `backend/app/models.py`

| Model | Table | Key Columns |
|-------|-------|-------------|
| Repository | repositories | `id` (Text PK, SHA256 of path), `path`, `name`, `last_opened`, `created_at` |
| PullRequest | pull_requests | `id` (auto), `repo_id` (FK), `title`, `description`, `source_branch`, `target_branch`, `status` (active/draft/completed/abandoned), `merge_strategy`, `author`, `ai_summary`, `ai_summary_agent`, timestamps |
| Comment | comments | `id` (auto), `pr_id` (FK), `parent_id` (FK self-ref for threads), `file_path`, `line_number`, `line_type`, `body`, `suggestion`, `suggestion_applied`, `is_ai_generated`, `ai_agent_name`, `author`, `status` (active/resolved), timestamps |
| Review | reviews | `id` (auto), `pr_id` (FK), `reviewer`, `vote` (approved/approved_with_suggestions/wait_for_author/rejected), `body`, `is_ai_generated`, `ai_agent_name`, `created_at` |
| RequiredReviewer | required_reviewers | `id` (auto), `pr_id` (FK), `reviewer_name` |
| Label | labels | `id` (auto), `name` (unique), `color`, `description` |
| PRLabel | pr_labels | `id` (auto), `pr_id` (FK), `label_id` (FK) — M2M junction |
| Webhook | webhooks | `id` (auto), `url`, `events` (comma-separated), `secret`, `active`, `created_at` |
| ChecklistItem | checklist_items | `id` (auto), `pr_id` (FK), `label`, `checked`, `details`, `category`, `author`, timestamps |

**Relationships:** Repository → PullRequest (1:N), PullRequest → Comment/Review/RequiredReviewer/ChecklistItem (1:N), PullRequest ↔ Label (M:N via PRLabel), Comment → Comment (self-ref for threads)

---

## Backend: All API Endpoints

### Repos (`routes/repos.py`, prefix: `/api`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/repos/validate` | Validate a path is a git repo |
| POST | `/api/repos/select` | Register repo, returns `{repo_id, name, path}` |
| GET | `/api/repos/recent` | 10 most recently opened repos |
| GET | `/api/repos/browse?path=~` | Browse filesystem directories |

### Branches (`routes/branches.py`, prefix: `/api/repos/{repo_id}`)

| Method | Path | Params | Description |
|--------|------|--------|-------------|
| GET | `/branches` | `?search=&limit=100` | List branches (fast: git for-each-ref) |

### Pull Requests (`routes/prs.py`, prefix: `/api/repos/{repo_id}`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/prs` | List PRs. Filter: `?status=active&label=bug` |
| POST | `/prs` | Create PR (validates branches, prevents duplicates) |
| GET | `/prs/{pr_id}` | Get PR with comment_count, review_summary, labels |
| PATCH | `/prs/{pr_id}` | Update title, description, status |
| DELETE | `/prs/{pr_id}` | Abandon PR (sets status=abandoned) |
| POST | `/prs/{pr_id}/summary` | Set AI summary `{summary, agent_name}` |
| GET | `/prs/{pr_id}/summary` | Get AI summary |
| GET | `/prs/{pr_id}/context` | Rich context. `?include=diffs,comments,reviews,commits&max_diff_lines=500` |

### Diffs (`routes/diffs.py`, prefix: `/api/repos/{repo_id}/prs/{pr_id}/diff`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/files` | Changed files list with insertions/deletions |
| GET | `/file?path=...` | Single file unified diff |
| GET | `/stats` | files_changed, insertions, deletions |
| GET | `/full` | Full unified diff text |
| GET | `/blame?path=...` | Per-line blame info |

### Commits (`routes/commits.py`, prefix: `/api/repos/{repo_id}/prs/{pr_id}`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/commits` | List commits in PR range |
| GET | `/commits/{sha}/diff` | Full diff for single commit |
| GET | `/commits/{sha}/files` | Changed files in commit |
| GET | `/commits/{sha}/diff/file?path=...` | File diff within commit |

### Comments (`routes/comments.py`, prefix: `/api/repos/{repo_id}/prs/{pr_id}`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/comments` | Threaded comment tree. `?ai_only=true` |
| POST | `/comments` | Create comment (general, inline, or reply) |
| PATCH | `/comments/{id}` | Edit comment body |
| DELETE | `/comments/{id}` | Delete comment |
| POST | `/comments/{id}/resolve` | Toggle active↔resolved |
| POST | `/comments/{id}/apply-suggestion` | Apply suggestion to file (writes to disk, commits) |
| POST | `/comments/batch` | Batch create multiple comments |

### Reviews (`routes/reviews.py`, prefix: `/api/repos/{repo_id}/prs/{pr_id}`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reviews` | List all reviews |
| POST | `/reviews` | Submit review with vote |

### Merge (`routes/merge.py`, prefix: `/api/repos/{repo_id}/prs/{pr_id}/merge`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/check` | Check merge feasibility (conflicts, approval) |
| POST | `/` | Execute merge (strategy: merge/squash/rebase) |
| GET | `/conflicts` | Get per-file conflict details (ours/theirs/base) |
| POST | `/resolve` | Resolve conflicts with manual resolutions |

### Labels (`routes/labels.py`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/labels` | List all labels |
| POST | `/api/labels` | Create label |
| DELETE | `/api/labels/{id}` | Delete label |
| POST | `/api/repos/{repo_id}/prs/{pr_id}/labels` | Add label to PR |
| DELETE | `/api/repos/{repo_id}/prs/{pr_id}/labels/{id}` | Remove label from PR |

### Compare (`routes/compare.py`, prefix: `/api/repos/{repo_id}/compare/{source}...{target}`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Diff stats between any two branches |
| GET | `/files` | Changed files between branches |
| GET | `/commits` | Commits between branches |
| GET | `/diff` | Full diff between branches |
| GET | `/diff/file?path=...` | File diff between branches |

### Webhooks (`routes/webhooks.py`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/webhooks` | List webhooks |
| POST | `/api/webhooks` | Register webhook (events: pr.created, pr.updated, pr.merged, comment.created, review.created, *) |
| DELETE | `/api/webhooks/{id}` | Delete webhook |

### Checklist (`routes/checklist.py`, prefix: `/api/repos/{repo_id}/prs/{pr_id}`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/checklist` | List checklist items |
| POST | `/checklist` | Create multiple items |
| PATCH | `/checklist/{id}` | Update item (label, checked, details) |
| DELETE | `/checklist/{id}` | Delete item |

---

## Backend: GitService

**File:** `backend/app/services/git_service.py`

All methods are `@staticmethod` (except repo cache). Uses GitPython.

| Method | Signature | Purpose |
|--------|-----------|---------|
| `get_repo` | `(repo_path: str) → Repo` | Get or create cached Repo instance |
| `clear_cache` | `(repo_path: str)` | Remove cached instance |
| `validate_repo` | `(path: str) → (bool, Optional[str])` | Check if path is valid git repo |
| `get_branches` | `(repo, search?, limit?) → list[dict]` | Fast branch list via `git for-each-ref` |
| `get_merge_base` | `(repo, source, target) → Optional[str]` | Common ancestor SHA |
| `get_diff_text` | `(repo, source, target) → str` | Full unified diff (merge-base aware) |
| `get_file_diff` | `(repo, source, target, file_path) → str` | Single file diff |
| `get_changed_files` | `(repo, source, target) → list[dict]` | Files with insertions/deletions/status |
| `get_diff_stats` | `(repo, source, target) → dict` | Aggregate stats |
| `get_commits_between` | `(repo, source, target) → list[dict]` | Commits in range |
| `get_commit_diff` | `(repo, sha) → str` | Diff for single commit |
| `get_commit_changed_files` | `(repo, sha) → list[dict]` | Files changed in commit |
| `get_commit_file_diff` | `(repo, sha, file_path) → str` | File diff in commit |
| `check_conflicts` | `(repo, source, target) → (bool, list[str])` | Detect merge conflicts |
| `get_conflict_details` | `(repo, source, target) → list[dict]` | Per-file conflict content (ours/theirs/base) |
| `resolve_conflict` | `(repo, source, target, resolutions, msg?) → (bool, str, sha?)` | Apply resolutions and commit |
| `execute_merge` | `(repo, source, target, strategy, msg?, delete?) → (bool, str, sha?)` | Execute merge/squash/rebase |

**Key pattern:** All diff methods calculate merge-base first, then diff `base..source` (not `target..source`). This shows only PR changes, same as GitHub/Azure DevOps.

---

## Backend: Key Patterns

**Repo ID:** SHA256 hash of absolute path, first 12 chars. Generated in `repos.py`.

**User identity:** `X-PRView-User` header → `get_current_user()` dependency. Defaults to `"local-user"`.

**Error codes:**
- 404 — repo/PR/comment/review not found
- 400 — validation errors (invalid branches, merge conflicts)
- 409 — duplicate (e.g., same branch pair PR already exists)

**Route dependency pattern:** Each route module defines a `get_repo_path(repo_id, db)` helper that looks up the Repository model and returns the filesystem path. This is injected via `Depends()`.

**AI metadata:** Comments and reviews have `is_ai_generated` (int 0/1) and `ai_agent_name` (string). Summaries have `ai_summary_agent`.

**Startup events in main.py:**
1. `init_db()` — create tables
2. `seed_default_labels()` — 5 default labels (bug, feature, breaking-change, WIP, docs)
3. `migrate_db()` — add AI columns if missing (schema migration)

---

## Frontend: Routes

**File:** `frontend/src/App.tsx`

| Path | Page | Description |
|------|------|-------------|
| `/` | RepoSelectPage | Select git repository |
| `/settings` | SettingsPage | User preferences |
| `/repos/:repoId/prs` | PRListPage | List PRs for repo |
| `/repos/:repoId/prs/:prId` | PRDetailPage | PR detail (default: overview tab) |
| `/repos/:repoId/prs/:prId/:tab` | PRDetailPage | PR detail with tab (overview/files/commits/conflicts) |
| `/repos/:repoId/compare` | ComparePage | Branch comparison |
| `/repos/:repoId/compare/:branches` | ComparePage | Compare specific branches (format: `source...target`) |

---

## Frontend: Pages

### RepoSelectPage
- Text input for repo path + "Browse" button for filesystem navigation
- Validates path via `POST /repos/validate`, shows repo name + branch count
- Lists recent repos from `GET /repos/recent`
- Sets `useRepoStore` on selection, navigates to PR list

### PRListPage
- Search bar (title, branch, author, #id), status filter tabs
- "New Pull Request" modal with `BranchPicker` (searchable dropdown, debounced server-side search)
- Links to ComparePage and individual PRs
- Each row: status badge, title, labels, branch info, author, dates

### PRDetailPage (~1400 lines, the largest page)
**4 tabs via URL param:**

- **Overview:** Editable title/description (markdown), reviews with votes, general comments, labels, checklist, merge UI, AI summary card
- **Files:** FileTree sidebar (resizable 160-600px) + diff viewer. 4 view modes. Inline comment injection. Review checkboxes per file.
- **Commits:** Expandable accordion — each commit shows files + diff inline. Uses `expandedCommits: Set<string>` for multi-expand.
- **Conflicts:** File list with resolved/unresolved indicators, textarea for manual resolution, "Resolve Conflicts" button

**Key state:**
```
pr, files, stats, commits, comments, reviews, conflictFiles
selectedFile, fileDiffs (cached), fullDiff
expandedCommits, commitDiffs, commitFilesMap, commitSelectedFiles, commitFileDiffs
sidebarWidth (260, resizable)
inlineComment, showGeneralComment, showReview, showMerge
editingTitle, editingDesc, allLabels, checklist
```

**Keyboard shortcuts:** `?` help, `1-4` tabs, `j/k` next/prev file, `a` all files, `Esc` close

### ComparePage
- Two `BranchSelector` dropdowns (server-side search, 300ms debounce)
- URL format: `/repos/:repoId/compare/source...target`
- FileTree sidebar + diff viewer (same pattern as PRDetailPage Files tab)
- "Create PR" button pre-fills branches

### SettingsPage
- Display name (with Avatar preview)
- Diff view mode: side-by-side | inline | existing | modified
- Default merge strategy: merge | squash | rebase
- Theme: light | dark

---

## Frontend: TypeScript Interfaces

**File:** `frontend/src/types.ts`

```typescript
PR          { id, repo_id, title, description, source_branch, target_branch, status, author,
              created_at, updated_at, completed_at, comment_count, review_summary,
              required_reviewers, approval_status, labels, ai_summary }
Label       { id, name, color, description }
DiffFile    { path, status, insertions, deletions, old_path? }
DiffStats   { files_changed, insertions, deletions }
Commit      { sha, short_sha, message, author_name, author_email, authored_date, files_changed }
Comment     { id, pr_id, parent_id, file_path, line_number, line_type, body, author, status,
              suggestion, suggestion_applied, is_ai_generated, ai_agent_name, created_at,
              updated_at, replies: Comment[] }
Review      { id, pr_id, reviewer, vote, body, created_at, is_ai_generated, ai_agent_name }
ConflictFile { path, conflict_content, ours, theirs, base }
BranchInfo  { name, is_current, commit_sha, commit_message }
ChecklistItem { id, pr_id, label, checked, details, category, author, created_at, updated_at }
```

---

## Frontend: Zustand Stores

| Store | File | localStorage Key | State |
|-------|------|-------------------|-------|
| `useSettingsStore` | `settings.store.ts` | `prv-settings` | `displayName`, `diffViewMode`, `defaultMergeStrategy`, `theme` + setters |
| `useRepoStore` | `repo.store.ts` | (none) | `repoId`, `repoName`, `repoPath` + `setRepo()`, `clearRepo()` |
| `usePRStore` | `pr.store.ts` | (none) | `diffViewMode` + `toggleDiffViewMode()`, `setDiffViewMode()` |
| `useThemeStore` | `theme.store.ts` | `prv-theme` | `dark: boolean` + `toggle()` |
| `useFileReviewStore` | `fileReview.store.ts` | `prv-file-review` | `reviewedFiles: Record<prId, filePath[]>` + `isReviewed()`, `toggleReviewed()`, `getReviewedCount()` |

**Note:** `useSettingsStore` is the primary settings store (persisted). `usePRStore` and `useThemeStore` are simpler alternatives used in some places.

---

## Frontend: API Client

**File:** `frontend/src/api/client.ts`

```typescript
export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
  patch: <T>(url: string, body: unknown) => request<T>(url, { method: 'PATCH', body }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};
```

- Base URL: `/api` (proxied to :8121 by Vite)
- Auto-sets `Content-Type: application/json` and `X-PRView-User` header from settings store
- Throws `Error(detail)` on non-2xx responses

---

## Frontend: Components

### Layout Components

| Component | Props | Purpose |
|-----------|-------|---------|
| `Header` | `breadcrumbs: {label, to?}[]` | Blue nav bar (#0078d4), PRView logo, breadcrumbs, theme toggle, settings link |
| `Modal` | `open, onClose, children` | Centered overlay modal, click-outside closes |
| `Avatar` | `name, size?` | Deterministic colored circle with initials |
| `ToastProvider` | wraps app | `useToast()` → `addToast(type, message)`. Auto-dismiss 5s. Types: success/error/info/warning |
| `ShortcutHelpModal` | `open, onClose` | Keyboard shortcut reference grid |

### PR Components

| Component | Props | Purpose |
|-----------|-------|---------|
| `FileTree` | `files, selectedFile, onSelectFile, fileCount, stats?, headerExtra?, reviewedFiles?` | Collapsible folder tree from flat file paths. Folders show aggregated +/-. Files show status badge (A/M/D/R) and +/-. Optional review checkboxes. |
| `CommentBlock` | `comment, onResolve, onDelete, onReply` | Renders comment with avatar, AI badge, markdown body, action buttons, nested replies |
| `LabelBadge` | `name, color, onRemove?` | Colored chip with label name and optional remove button |
| `MarkdownEditor` | `value, onChange, placeholder?, minHeight?` | Write/Preview/Split tabs. Uses ReactMarkdown + remark-gfm |

### Diff Components

| Component | Props | Purpose |
|-----------|-------|---------|
| `DiffToolbar` | `title, subtitle?, diffViewMode, onModeChange, extraControls?` | Toolbar with title and 4 mode buttons (Inline/Side by Side/Existing/Modified) |

---

## Frontend: Key Patterns

### Diff Rendering (Diff2HtmlUI)

Used in PRDetailPage and ComparePage. Pattern:

```typescript
// 1. Get diff text from API
const diffText = fileDiffs[selectedFile] || fullDiff;

// 2. Apply filter for existing/modified modes
const renderText = (mode === 'existing' || mode === 'modified')
  ? filterDiffSide(diffText, mode)
  : diffText;

// 3. Render with Diff2HtmlUI
container.innerHTML = '';
const ui = new Diff2HtmlUI(container, renderText, {
  outputFormat: mode === 'side-by-side' ? 'side-by-side' : 'line-by-line',
  drawFileList: false,
  matching: 'lines',
  highlight: true,
  synchronisedScroll: true,
});
ui.draw();
ui.highlightCode();
if (mode === 'side-by-side') ui.synchronisedScroll();
```

### filterDiffSide (utils/diffFilter.ts)

- `'existing'` → Target branch code. Strips `+` lines, converts `-` to context (no coloring). Plain text view.
- `'modified'` → Source branch code. Keeps all `+/-` markers so diff2html renders red/green backgrounds.

### Inline Comment Injection

After Diff2HtmlUI renders, DOM is queried for `.d2h-diff-tbody tr` rows. Each row gets a `+` button injected. Clicking sets `inlineComment` state which opens the comment editor for that file/line.

### Resizable Sidebar

```typescript
const [sidebarWidth, setSidebarWidth] = useState(260);
// Grid: `${sidebarWidth}px 8px minmax(0, 1fr)`
// 8px column is a drag handle
// onMouseDown → listen mousemove/mouseup on document
// Clamp: Math.max(160, Math.min(600, newWidth))
```

### FileTree (components/pr/FileTree.tsx)

- `buildTree(files)`: splits paths by `/`, builds nested TreeNode[], sorts folders-first then alphabetical, aggregates insertions/deletions bottom-up. Memoized with `useMemo`.
- State: `collapsed: Set<string>` — all folders expanded by default
- Renders recursively with `paddingLeft: 12 + depth * 16`

### BranchSelector (in ComparePage and PRListPage)

- Server-side search: `GET /branches?search=query&limit=50`
- 300ms debounce via `setTimeout` ref
- Click-outside closes dropdown
- Shows "HEAD" badge on current branch

### Commit Accordion (PRDetailPage Commits tab)

- `expandedCommits: Set<string>` — multiple can be open
- `toggleCommit(sha)` — adds/removes from set
- On expand: lazy-loads commit diff and files
- Each expanded commit shows file chips + diff viewer
- Uses callback refs for multiple Diff2HtmlUI instances

---

## Styling Conventions

**All inline styles** — no CSS classes (except diff2html's own classes). No Tailwind utility classes in components.

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary blue | `#0078d4` | Active states, buttons, links, header |
| Success green | `#107c10` | Approved, additions, added files |
| Danger red | `#d13438` | Rejected, deletions, deleted files, conflicts |
| Warning orange | `#ca5010` | Suggestions, modified files, wait_for_author |
| Info blue | `#0078d4` | Labels, renamed files |
| Text primary | `#1a1a1a` | Main text |
| Text secondary | `#5f6368` | Muted text, timestamps |
| Background | `#f4f5f7` | Page background |
| Card | `#ffffff` | Card/panel background |
| Border | `#dadce0` | Borders, dividers |
| Hover | `#f9f9f9` | Hover state on list items |
| Selected | `#e8f4fd` | Selected item background |

### Status Badge Colors

```typescript
const statusColors = {
  added: '#107c10',    // A badge
  modified: '#ca5010', // M badge
  deleted: '#d13438',  // D badge
  renamed: '#0078d4',  // R badge
};
```

---

## How to Add a Feature

### Adding a new backend endpoint

1. **Schema:** Add request/response Pydantic models in `backend/app/schemas.py`
2. **Route:** Create or extend a route file in `backend/app/routes/`. Use `APIRouter` with prefix. Add `get_repo_path` dependency for repo-scoped routes.
3. **Service:** If git operations needed, add methods to `GitService` in `backend/app/services/git_service.py`
4. **Model:** If new DB table needed, add SQLAlchemy model in `backend/app/models.py`. Run `init_db()` on startup.
5. **Register:** Include router in `main.py` if new file
6. **Test:** Add test file in `backend/tests/` following existing patterns (use conftest fixtures)

### Adding a new frontend page

1. **Create page** in `frontend/src/pages/NewPage.tsx`
2. **Add route** in `frontend/src/App.tsx`
3. **Use `api` client** from `frontend/src/api/client.ts` for API calls
4. **Follow patterns:** Header with breadcrumbs, inline styles, same color palette
5. **Add types** to `frontend/src/types.ts` if needed
6. **Use existing stores** or create new Zustand store in `frontend/src/stores/`

### Adding a new component

1. **Create** in appropriate `frontend/src/components/` subdirectory
2. **Export** with named export (not default)
3. **Props interface** defined in same file
4. **Style** with inline `style` props, not CSS classes
5. **Import** in the consuming page

### Adding a new diff feature

1. **Backend:** Add method to GitService if new git data needed
2. **Frontend:** Modify the `useEffect` that calls `Diff2HtmlUI` in PRDetailPage/ComparePage
3. **Toolbar:** Extend `DiffToolbar` or add `extraControls` prop content
4. **Filter:** Extend `filterDiffSide()` in `utils/diffFilter.ts` if new view mode

---

## Testing

```bash
bash test.sh                        # Run all 83 tests
bash test.sh -k "labels"            # Run specific tests
bash test.sh --tb=long              # Verbose output

cd frontend && ./node_modules/.bin/tsc --noEmit   # TypeScript check (no frontend tests)
```

Test fixtures (conftest.py) provide: TestClient, temp git repo with branches/commits, registered repo_id, created pr_id, current_user headers.

---

## Other References

- **`AGENT_PR_GUIDE.md`** — Complete API reference with curl examples for AI bots doing PR reviews
- **`README.md`** — User-facing docs with screenshots, feature list, usage guide
