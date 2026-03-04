from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Repository, PullRequest, Comment, Review
from app.schemas import PRCreateRequest, PRUpdateRequest, PRResponse
from app.services.git_service import GitService

router = APIRouter(prefix="/api/repos/{repo_id}/prs", tags=["pull-requests"])


def get_repo_record(repo_id: str, db: Session) -> Repository:
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


def build_pr_response(pr: PullRequest, db: Session) -> dict:
    comment_count = db.query(Comment).filter(Comment.pr_id == pr.id).count()
    reviews = db.query(Review).filter(Review.pr_id == pr.id).all()
    review_summary = {}
    for r in reviews:
        review_summary[r.reviewer] = r.vote
    return {
        **{c.name: getattr(pr, c.name) for c in pr.__table__.columns},
        "comment_count": comment_count,
        "review_summary": review_summary,
    }


@router.get("", response_model=list[PRResponse])
def list_prs(repo_id: str, status: Optional[str] = Query(None), db: Session = Depends(get_db)):
    get_repo_record(repo_id, db)
    query = db.query(PullRequest).filter(PullRequest.repo_id == repo_id)
    if status:
        query = query.filter(PullRequest.status == status)
    prs = query.order_by(PullRequest.created_at.desc()).all()
    return [build_pr_response(pr, db) for pr in prs]


@router.post("", response_model=PRResponse, status_code=201)
def create_pr(repo_id: str, req: PRCreateRequest, db: Session = Depends(get_db)):
    repo_record = get_repo_record(repo_id, db)
    repo = GitService.get_repo(repo_record.path)

    branches = [b["name"] for b in GitService.get_branches(repo)]
    if req.source_branch not in branches:
        raise HTTPException(status_code=400, detail=f"Source branch '{req.source_branch}' not found")
    if req.target_branch not in branches:
        raise HTTPException(status_code=400, detail=f"Target branch '{req.target_branch}' not found")
    if req.source_branch == req.target_branch:
        raise HTTPException(status_code=400, detail="Source and target branches must be different")

    pr = PullRequest(
        repo_id=repo_id,
        title=req.title,
        description=req.description,
        source_branch=req.source_branch,
        target_branch=req.target_branch,
        status=req.status,
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)
    return build_pr_response(pr, db)


@router.get("/{pr_id}", response_model=PRResponse)
def get_pr(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    get_repo_record(repo_id, db)
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    return build_pr_response(pr, db)


@router.patch("/{pr_id}", response_model=PRResponse)
def update_pr(repo_id: str, pr_id: int, req: PRUpdateRequest, db: Session = Depends(get_db)):
    get_repo_record(repo_id, db)
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")

    if req.title is not None:
        pr.title = req.title
    if req.description is not None:
        pr.description = req.description
    if req.status is not None:
        pr.status = req.status
        if req.status == "completed":
            pr.completed_at = datetime.now(timezone.utc)

    pr.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(pr)
    return build_pr_response(pr, db)


@router.delete("/{pr_id}")
def abandon_pr(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    get_repo_record(repo_id, db)
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    pr.status = "abandoned"
    pr.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Pull request abandoned"}
