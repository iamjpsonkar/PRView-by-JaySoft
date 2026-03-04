from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Repository, PullRequest
from app.schemas import CommitInfo
from app.services.git_service import GitService

router = APIRouter(prefix="/api/repos/{repo_id}/prs/{pr_id}/commits", tags=["commits"])


def get_pr_and_repo(repo_id: str, pr_id: int, db: Session):
    repo_record = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    return pr, GitService.get_repo(repo_record.path)


@router.get("", response_model=list[CommitInfo])
def list_commits(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    pr, repo = get_pr_and_repo(repo_id, pr_id, db)
    return GitService.get_commits_between(repo, pr.source_branch, pr.target_branch)


@router.get("/{sha}/diff")
def get_commit_diff(repo_id: str, pr_id: int, sha: str, db: Session = Depends(get_db)):
    pr, repo = get_pr_and_repo(repo_id, pr_id, db)
    try:
        diff_text = GitService.get_commit_diff(repo, sha)
        return {"diff_text": diff_text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
