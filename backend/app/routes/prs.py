from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Repository, PullRequest, Comment, Review, RequiredReviewer, PRLabel, Label
from app.schemas import PRCreateRequest, PRUpdateRequest, PRResponse, PRSummaryRequest
from app.services.git_service import GitService

router = APIRouter(prefix="/api/repos/{repo_id}/prs", tags=["pull-requests"])


def get_repo_record(repo_id: str, db: Session) -> Repository:
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo


def build_pr_response(pr: PullRequest, db: Session) -> dict:
    comment_count = db.query(Comment).filter(Comment.pr_id == pr.id).count()
    required_reviewer_names = [rr.reviewer_name for rr in pr.required_reviewers]
    reviews = db.query(Review).filter(Review.pr_id == pr.id).all()
    # Get latest review per reviewer
    review_summary = {}
    for r in reviews:
        review_summary[r.reviewer] = r.vote
    # Compute approval status for required reviewers
    approval_status = {}
    for name in required_reviewer_names:
        approval_status[name] = review_summary.get(name, "pending")
    return {
        **{c.name: getattr(pr, c.name) for c in pr.__table__.columns},
        "comment_count": comment_count,
        "review_summary": review_summary,
        "required_reviewers": required_reviewer_names,
        "approval_status": approval_status,
        "labels": [{"id": l.id, "name": l.name, "color": l.color, "description": l.description} for l in pr.labels],
        "ai_summary": pr.ai_summary,
    }


@router.get("", response_model=list[PRResponse])
def list_prs(repo_id: str, status: Optional[str] = Query(None), label: Optional[str] = Query(None), db: Session = Depends(get_db)):
    get_repo_record(repo_id, db)
    query = db.query(PullRequest).filter(PullRequest.repo_id == repo_id)
    if status:
        query = query.filter(PullRequest.status == status)
    if label:
        query = query.join(PRLabel, PRLabel.pr_id == PullRequest.id).join(Label, Label.id == PRLabel.label_id).filter(Label.name == label)
    prs = query.order_by(PullRequest.created_at.desc()).all()
    return [build_pr_response(pr, db) for pr in prs]


@router.post("", response_model=PRResponse, status_code=201)
def create_pr(repo_id: str, req: PRCreateRequest, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    repo_record = get_repo_record(repo_id, db)
    repo = GitService.get_repo(repo_record.path)

    branches = [b["name"] for b in GitService.get_branches(repo)]
    if req.source_branch not in branches:
        raise HTTPException(status_code=400, detail=f"Source branch '{req.source_branch}' not found")
    if req.target_branch not in branches:
        raise HTTPException(status_code=400, detail=f"Target branch '{req.target_branch}' not found")
    if req.source_branch == req.target_branch:
        raise HTTPException(status_code=400, detail="Source and target branches must be different")

    existing = db.query(PullRequest).filter(
        PullRequest.repo_id == repo_id,
        PullRequest.source_branch == req.source_branch,
        PullRequest.target_branch == req.target_branch,
        PullRequest.status.in_(["active", "draft"]),
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"An active PR (#{existing.id}) already exists for {req.source_branch} → {req.target_branch}",
        )

    pr = PullRequest(
        repo_id=repo_id,
        title=req.title,
        description=req.description,
        source_branch=req.source_branch,
        target_branch=req.target_branch,
        status=req.status,
    )
    pr.author = current_user
    db.add(pr)
    db.flush()
    for reviewer_name in req.required_reviewers:
        rr = RequiredReviewer(pr_id=pr.id, reviewer_name=reviewer_name)
        db.add(rr)
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


@router.post("/{pr_id}/summary")
def set_pr_summary(repo_id: str, pr_id: int, req: PRSummaryRequest, db: Session = Depends(get_db)):
    get_repo_record(repo_id, db)
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    pr.ai_summary = req.summary
    pr.ai_summary_agent = req.agent_name
    pr.ai_summary_updated_at = datetime.now(timezone.utc)
    pr.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"summary": pr.ai_summary, "agent_name": pr.ai_summary_agent, "updated_at": pr.ai_summary_updated_at}


@router.get("/{pr_id}/summary")
def get_pr_summary(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    get_repo_record(repo_id, db)
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    return {"summary": pr.ai_summary, "agent_name": pr.ai_summary_agent, "updated_at": pr.ai_summary_updated_at}


@router.get("/{pr_id}/context")
def get_pr_context(repo_id: str, pr_id: int, include: Optional[str] = Query("diffs,comments,reviews,commits"), max_diff_lines: Optional[int] = Query(None), db: Session = Depends(get_db)):
    repo_record = get_repo_record(repo_id, db)
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    includes = set(include.split(",")) if include else set()
    repo = GitService.get_repo(repo_record.path)
    result = {"pr": build_pr_response(pr, db)}
    try:
        result["stats"] = GitService.get_diff_stats(repo, pr.source_branch, pr.target_branch)
    except Exception:
        result["stats"] = None
    if "diffs" in includes:
        try:
            result["files"] = GitService.get_changed_files(repo, pr.source_branch, pr.target_branch)
            full_diff = GitService.get_diff_text(repo, pr.source_branch, pr.target_branch)
            if max_diff_lines and full_diff:
                lines = full_diff.split("\n")
                if len(lines) > max_diff_lines:
                    full_diff = "\n".join(lines[:max_diff_lines]) + f"\n... (truncated, {len(lines) - max_diff_lines} more lines)"
            result["full_diff"] = full_diff
        except Exception:
            result["files"] = []
            result["full_diff"] = None
    if "comments" in includes:
        from app.routes.comments import build_comment_tree
        comments_list = db.query(Comment).filter(Comment.pr_id == pr_id).order_by(Comment.created_at).all()
        result["comments"] = build_comment_tree(comments_list)
    if "reviews" in includes:
        reviews_list = db.query(Review).filter(Review.pr_id == pr_id).order_by(Review.created_at.desc()).all()
        result["reviews"] = [
            {"id": r.id, "pr_id": r.pr_id, "reviewer": r.reviewer, "vote": r.vote,
             "body": r.body, "created_at": r.created_at,
             "is_ai_generated": bool(r.is_ai_generated), "ai_agent_name": r.ai_agent_name}
            for r in reviews_list
        ]
    if "commits" in includes:
        try:
            result["commits"] = GitService.get_commits_between(repo, pr.source_branch, pr.target_branch)
        except Exception:
            result["commits"] = []
    return result
