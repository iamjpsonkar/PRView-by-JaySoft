from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PullRequest, Review
from app.schemas import ReviewCreateRequest, ReviewResponse

router = APIRouter(prefix="/api/repos/{repo_id}/prs/{pr_id}/reviews", tags=["reviews"])

VALID_VOTES = {"approved", "approved_with_suggestions", "wait_for_author", "rejected"}


@router.get("", response_model=list[ReviewResponse])
def list_reviews(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    reviews = db.query(Review).filter(Review.pr_id == pr_id).order_by(Review.created_at.desc()).all()
    return reviews


@router.post("", response_model=ReviewResponse, status_code=201)
def create_review(repo_id: str, pr_id: int, req: ReviewCreateRequest, db: Session = Depends(get_db)):
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    if req.vote not in VALID_VOTES:
        raise HTTPException(status_code=400, detail=f"Invalid vote. Must be one of: {VALID_VOTES}")

    review = Review(pr_id=pr_id, vote=req.vote, body=req.body)
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
