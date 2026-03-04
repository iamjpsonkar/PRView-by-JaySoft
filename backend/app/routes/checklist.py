from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import PullRequest, ChecklistItem
from app.schemas import ChecklistCreateRequest, ChecklistItemResponse, ChecklistItemUpdateRequest

router = APIRouter(prefix="/api/repos/{repo_id}/prs/{pr_id}/checklist", tags=["checklist"])


def get_pr(repo_id: str, pr_id: int, db: Session) -> PullRequest:
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    return pr


@router.get("", response_model=list[ChecklistItemResponse])
def list_checklist(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    get_pr(repo_id, pr_id, db)
    items = db.query(ChecklistItem).filter(ChecklistItem.pr_id == pr_id).order_by(ChecklistItem.created_at).all()
    return [{"id": item.id, "pr_id": item.pr_id, "label": item.label, "checked": bool(item.checked),
             "details": item.details, "category": item.category, "author": item.author,
             "created_at": item.created_at, "updated_at": item.updated_at} for item in items]


@router.post("", response_model=list[ChecklistItemResponse], status_code=201)
def create_checklist(repo_id: str, pr_id: int, req: ChecklistCreateRequest, db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    get_pr(repo_id, pr_id, db)
    created = []
    for item_req in req.items:
        item = ChecklistItem(pr_id=pr_id, label=item_req.label, checked=1 if item_req.checked else 0,
                             details=item_req.details, category=item_req.category, author=current_user)
        db.add(item)
        db.flush()
        created.append(item)
    db.commit()
    return [{"id": item.id, "pr_id": item.pr_id, "label": item.label, "checked": bool(item.checked),
             "details": item.details, "category": item.category, "author": item.author,
             "created_at": item.created_at, "updated_at": item.updated_at} for item in created]


@router.patch("/{item_id}", response_model=ChecklistItemResponse)
def update_checklist_item(repo_id: str, pr_id: int, item_id: int, req: ChecklistItemUpdateRequest, db: Session = Depends(get_db)):
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id, ChecklistItem.pr_id == pr_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    if req.label is not None:
        item.label = req.label
    if req.checked is not None:
        item.checked = 1 if req.checked else 0
    if req.details is not None:
        item.details = req.details
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "pr_id": item.pr_id, "label": item.label, "checked": bool(item.checked),
            "details": item.details, "category": item.category, "author": item.author,
            "created_at": item.created_at, "updated_at": item.updated_at}


@router.delete("/{item_id}")
def delete_checklist_item(repo_id: str, pr_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id, ChecklistItem.pr_id == pr_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    db.delete(item)
    db.commit()
    return {"message": "Checklist item deleted"}
