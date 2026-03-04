from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PullRequest, Comment
from app.schemas import CommentCreateRequest, CommentUpdateRequest, CommentResponse

router = APIRouter(prefix="/api/repos/{repo_id}/prs/{pr_id}/comments", tags=["comments"])


def get_pr(repo_id: str, pr_id: int, db: Session) -> PullRequest:
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    return pr


def build_comment_tree(comments: list[Comment]) -> list[dict]:
    comment_map = {}
    roots = []

    for c in comments:
        entry = {
            "id": c.id, "pr_id": c.pr_id, "parent_id": c.parent_id,
            "file_path": c.file_path, "line_number": c.line_number,
            "line_type": c.line_type, "body": c.body, "author": c.author,
            "status": c.status, "created_at": c.created_at,
            "updated_at": c.updated_at, "replies": [],
        }
        comment_map[c.id] = entry

    for c in comments:
        entry = comment_map[c.id]
        if c.parent_id and c.parent_id in comment_map:
            comment_map[c.parent_id]["replies"].append(entry)
        else:
            roots.append(entry)

    return roots


@router.get("", response_model=list[CommentResponse])
def list_comments(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    get_pr(repo_id, pr_id, db)
    comments = db.query(Comment).filter(Comment.pr_id == pr_id).order_by(Comment.created_at).all()
    return build_comment_tree(comments)


@router.post("", response_model=CommentResponse, status_code=201)
def create_comment(repo_id: str, pr_id: int, req: CommentCreateRequest, db: Session = Depends(get_db)):
    get_pr(repo_id, pr_id, db)
    comment = Comment(
        pr_id=pr_id,
        parent_id=req.parent_id,
        file_path=req.file_path,
        line_number=req.line_number,
        line_type=req.line_type,
        body=req.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id, "pr_id": comment.pr_id, "parent_id": comment.parent_id,
        "file_path": comment.file_path, "line_number": comment.line_number,
        "line_type": comment.line_type, "body": comment.body, "author": comment.author,
        "status": comment.status, "created_at": comment.created_at,
        "updated_at": comment.updated_at, "replies": [],
    }


@router.patch("/{comment_id}", response_model=CommentResponse)
def update_comment(repo_id: str, pr_id: int, comment_id: int,
                   req: CommentUpdateRequest, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.pr_id == pr_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.body = req.body
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id, "pr_id": comment.pr_id, "parent_id": comment.parent_id,
        "file_path": comment.file_path, "line_number": comment.line_number,
        "line_type": comment.line_type, "body": comment.body, "author": comment.author,
        "status": comment.status, "created_at": comment.created_at,
        "updated_at": comment.updated_at, "replies": [],
    }


@router.delete("/{comment_id}")
def delete_comment(repo_id: str, pr_id: int, comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.pr_id == pr_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}


@router.post("/{comment_id}/resolve")
def resolve_comment(repo_id: str, pr_id: int, comment_id: int, db: Session = Depends(get_db)):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.pr_id == pr_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.status = "resolved" if comment.status == "active" else "active"
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": comment.status}
