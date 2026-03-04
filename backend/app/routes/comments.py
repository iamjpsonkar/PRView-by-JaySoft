from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import PullRequest, Comment, Repository
from app.schemas import CommentCreateRequest, CommentUpdateRequest, CommentResponse, BatchCommentCreateRequest

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
            "status": c.status, "suggestion": c.suggestion, "suggestion_applied": c.suggestion_applied,
            "is_ai_generated": bool(c.is_ai_generated), "ai_agent_name": c.ai_agent_name,
            "created_at": c.created_at,
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
def list_comments(repo_id: str, pr_id: int, ai_only: bool = Query(False), db: Session = Depends(get_db)):
    get_pr(repo_id, pr_id, db)
    query = db.query(Comment).filter(Comment.pr_id == pr_id)
    if ai_only:
        query = query.filter(Comment.is_ai_generated == 1)
    comments = query.order_by(Comment.created_at).all()
    return build_comment_tree(comments)


@router.post("", response_model=CommentResponse, status_code=201)
def create_comment(repo_id: str, pr_id: int, req: CommentCreateRequest, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    get_pr(repo_id, pr_id, db)
    comment = Comment(
        pr_id=pr_id,
        parent_id=req.parent_id,
        file_path=req.file_path,
        line_number=req.line_number,
        line_type=req.line_type,
        body=req.body,
        suggestion=req.suggestion,
        is_ai_generated=1 if req.is_ai_generated else 0,
        ai_agent_name=req.ai_agent_name,
    )
    comment.author = current_user
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "id": comment.id, "pr_id": comment.pr_id, "parent_id": comment.parent_id,
        "file_path": comment.file_path, "line_number": comment.line_number,
        "line_type": comment.line_type, "body": comment.body, "author": comment.author,
        "status": comment.status, "suggestion": comment.suggestion, "suggestion_applied": comment.suggestion_applied,
        "is_ai_generated": bool(comment.is_ai_generated), "ai_agent_name": comment.ai_agent_name,
        "created_at": comment.created_at,
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
        "status": comment.status, "suggestion": comment.suggestion, "suggestion_applied": comment.suggestion_applied,
        "is_ai_generated": bool(comment.is_ai_generated), "ai_agent_name": comment.ai_agent_name,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at, "replies": [],
    }


@router.post("/batch", status_code=201)
def create_comments_batch(repo_id: str, pr_id: int, req: BatchCommentCreateRequest, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    get_pr(repo_id, pr_id, db)
    created = []
    errors = []
    for i, c_req in enumerate(req.comments):
        try:
            comment = Comment(
                pr_id=pr_id, parent_id=c_req.parent_id, file_path=c_req.file_path,
                line_number=c_req.line_number, line_type=c_req.line_type, body=c_req.body,
                suggestion=c_req.suggestion, is_ai_generated=1 if c_req.is_ai_generated else 0,
                ai_agent_name=c_req.ai_agent_name,
            )
            comment.author = current_user
            db.add(comment)
            db.flush()
            created.append({
                "id": comment.id, "pr_id": comment.pr_id, "parent_id": comment.parent_id,
                "file_path": comment.file_path, "line_number": comment.line_number,
                "line_type": comment.line_type, "body": comment.body, "author": comment.author,
                "status": comment.status, "suggestion": comment.suggestion,
                "suggestion_applied": comment.suggestion_applied,
                "is_ai_generated": bool(comment.is_ai_generated),
                "ai_agent_name": comment.ai_agent_name,
                "created_at": comment.created_at, "updated_at": comment.updated_at, "replies": [],
            })
        except Exception as e:
            errors.append({"index": i, "error": str(e)})
    db.commit()
    return {"created": created, "errors": errors}


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


@router.post("/{comment_id}/apply-suggestion")
def apply_suggestion(repo_id: str, pr_id: int, comment_id: int, db: Session = Depends(get_db)):
    import os
    import git
    from app.services.git_service import GitService

    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.pr_id == pr_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if not comment.suggestion:
        raise HTTPException(status_code=400, detail="Comment has no suggestion")
    if comment.suggestion_applied:
        raise HTTPException(status_code=400, detail="Suggestion already applied")
    if not comment.file_path or not comment.line_number:
        raise HTTPException(status_code=400, detail="Comment must have file_path and line_number")

    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")

    repo_record = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")

    repo = GitService.get_repo(repo_record.path)

    try:
        # Read the file from the source branch
        source_commit = repo.heads[pr.source_branch].commit
        blob = source_commit.tree[comment.file_path]
        content = blob.data_object.read().decode('utf-8')
        lines = content.split('\n')

        # Replace the line
        line_idx = comment.line_number - 1
        if 0 <= line_idx < len(lines):
            lines[line_idx] = comment.suggestion
        else:
            raise HTTPException(status_code=400, detail=f"Line {comment.line_number} out of range")

        new_content = '\n'.join(lines)

        # Write to working tree, commit on source branch
        original_branch = repo.active_branch.name if not repo.head.is_detached else None
        repo.heads[pr.source_branch].checkout()

        file_full_path = os.path.join(repo.working_dir, comment.file_path)
        with open(file_full_path, 'w') as f:
            f.write(new_content)

        repo.index.add([comment.file_path])
        repo.index.commit(f"Apply suggestion from comment #{comment.id} on {comment.file_path}:{comment.line_number}")

        # Restore original branch
        if original_branch:
            repo.heads[original_branch].checkout()

        comment.suggestion_applied = 1
        comment.updated_at = datetime.now(timezone.utc)
        db.commit()

        return {"success": True, "message": "Suggestion applied"}
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"File not found in source branch: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply suggestion: {str(e)}")
