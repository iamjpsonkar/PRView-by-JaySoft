from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# --- Repository ---
class RepoValidateRequest(BaseModel):
    path: str


class RepoValidateResponse(BaseModel):
    valid: bool
    name: Optional[str] = None
    branch_count: Optional[int] = None
    error: Optional[str] = None


class RepoSelectResponse(BaseModel):
    repo_id: str
    name: str
    path: str


class RepoInfo(BaseModel):
    id: str
    name: str
    path: str
    last_opened: datetime

    class Config:
        from_attributes = True


class DirEntry(BaseModel):
    name: str
    path: str
    is_dir: bool
    is_git_repo: bool = False


# --- Branch ---
class BranchInfo(BaseModel):
    name: str
    is_current: bool
    commit_sha: str
    commit_message: str


# --- Labels ---
class LabelCreateRequest(BaseModel):
    name: str
    color: str = "#0078d4"
    description: str = ""


class LabelResponse(BaseModel):
    id: int
    name: str
    color: str
    description: str

    class Config:
        from_attributes = True


# --- Pull Request ---
class PRCreateRequest(BaseModel):
    title: str
    description: str = ""
    source_branch: str
    target_branch: str
    status: str = "active"
    required_reviewers: list[str] = []


class PRUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class PRResponse(BaseModel):
    id: int
    repo_id: str
    title: str
    description: str
    source_branch: str
    target_branch: str
    status: str
    merge_strategy: Optional[str] = None
    author: str
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    comment_count: int = 0
    review_summary: Optional[dict] = None
    required_reviewers: list[str] = []
    approval_status: dict = {}
    labels: list[LabelResponse] = []
    ai_summary: Optional[str] = None

    class Config:
        from_attributes = True


# --- Diff ---
class DiffFileInfo(BaseModel):
    path: str
    status: str  # added, modified, deleted, renamed
    insertions: int
    deletions: int
    old_path: Optional[str] = None


class DiffStats(BaseModel):
    files_changed: int
    insertions: int
    deletions: int


class DiffFileResponse(BaseModel):
    path: str
    diff_text: str
    status: str


# --- Commit ---
class CommitInfo(BaseModel):
    sha: str
    short_sha: str
    message: str
    author_name: str
    author_email: str
    authored_date: str
    files_changed: int = 0


# --- Comment ---
class CommentCreateRequest(BaseModel):
    body: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    line_type: Optional[str] = None
    parent_id: Optional[int] = None
    suggestion: Optional[str] = None
    is_ai_generated: bool = False
    ai_agent_name: Optional[str] = None


class CommentUpdateRequest(BaseModel):
    body: str


class CommentResponse(BaseModel):
    id: int
    pr_id: int
    parent_id: Optional[int] = None
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    line_type: Optional[str] = None
    body: str
    author: str
    status: str
    suggestion: Optional[str] = None
    suggestion_applied: int = 0
    is_ai_generated: bool = False
    ai_agent_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    replies: list["CommentResponse"] = []

    class Config:
        from_attributes = True


class SuggestionApplyRequest(BaseModel):
    """Optional commit message for applying suggestion"""
    commit_message: Optional[str] = None


# --- Review ---
class ReviewCreateRequest(BaseModel):
    vote: str  # approved, approved_with_suggestions, wait_for_author, rejected
    body: str = ""
    is_ai_generated: bool = False
    ai_agent_name: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    pr_id: int
    reviewer: str
    vote: str
    body: str
    created_at: datetime
    is_ai_generated: bool = False
    ai_agent_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Merge ---
class MergeCheckResponse(BaseModel):
    can_merge: bool
    has_conflicts: bool
    conflicting_files: list[str] = []


class MergeRequest(BaseModel):
    strategy: str = "merge"  # merge, squash, rebase
    commit_message: Optional[str] = None
    delete_source_branch: bool = False


class ConflictResolveRequest(BaseModel):
    resolutions: dict[str, str]  # file_path -> resolved content
    commit_message: Optional[str] = None


class MergeResponse(BaseModel):
    success: bool
    message: str
    merge_commit: Optional[str] = None


# --- Batch Comments ---
class BatchCommentCreateRequest(BaseModel):
    comments: list[CommentCreateRequest]


class BatchCommentResponse(BaseModel):
    created: list[CommentResponse] = []
    errors: list[dict] = []


# --- PR Summary ---
class PRSummaryRequest(BaseModel):
    summary: str
    agent_name: Optional[str] = None


class PRSummaryResponse(BaseModel):
    summary: Optional[str] = None
    agent_name: Optional[str] = None
    updated_at: Optional[datetime] = None


# --- Webhooks ---
class WebhookCreateRequest(BaseModel):
    url: str
    events: list[str]
    secret: Optional[str] = None


class WebhookResponse(BaseModel):
    id: int
    url: str
    events: list[str]
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Checklist ---
class ChecklistItemCreate(BaseModel):
    label: str
    checked: bool = False
    details: Optional[str] = None
    category: Optional[str] = None


class ChecklistCreateRequest(BaseModel):
    items: list[ChecklistItemCreate]


class ChecklistItemResponse(BaseModel):
    id: int
    pr_id: int
    label: str
    checked: bool
    details: Optional[str] = None
    category: Optional[str] = None
    author: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChecklistItemUpdateRequest(BaseModel):
    label: Optional[str] = None
    checked: Optional[bool] = None
    details: Optional[str] = None
