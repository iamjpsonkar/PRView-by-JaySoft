from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Repository, PullRequest
from app.schemas import MergeCheckResponse, MergeRequest, MergeResponse
from app.services.git_service import GitService

router = APIRouter(prefix="/api/repos/{repo_id}/prs/{pr_id}/merge", tags=["merge"])


def get_pr_and_repo(repo_id: str, pr_id: int, db: Session):
    repo_record = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    return pr, GitService.get_repo(repo_record.path)


@router.post("/check", response_model=MergeCheckResponse)
def check_merge(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    pr, repo = get_pr_and_repo(repo_id, pr_id, db)
    has_conflicts, conflicting_files = GitService.check_conflicts(repo, pr.source_branch, pr.target_branch)
    return MergeCheckResponse(
        can_merge=not has_conflicts,
        has_conflicts=has_conflicts,
        conflicting_files=conflicting_files,
    )


@router.post("", response_model=MergeResponse)
def execute_merge(repo_id: str, pr_id: int, req: MergeRequest, db: Session = Depends(get_db)):
    pr, repo = get_pr_and_repo(repo_id, pr_id, db)

    if pr.status != "active":
        raise HTTPException(status_code=400, detail="Can only merge active pull requests")

    valid_strategies = {"merge", "squash", "rebase"}
    if req.strategy not in valid_strategies:
        raise HTTPException(status_code=400, detail=f"Invalid strategy. Must be one of: {valid_strategies}")

    success, message, merge_sha = GitService.execute_merge(
        repo, pr.source_branch, pr.target_branch,
        req.strategy, req.commit_message, req.delete_source_branch,
    )

    if success:
        pr.status = "completed"
        pr.merge_strategy = req.strategy
        pr.completed_at = datetime.now(timezone.utc)
        pr.updated_at = datetime.now(timezone.utc)
        db.commit()

    return MergeResponse(success=success, message=message, merge_commit=merge_sha)
