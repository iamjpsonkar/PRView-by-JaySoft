from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Label, PRLabel, PullRequest
from app.schemas import LabelCreateRequest, LabelResponse

router = APIRouter(tags=["labels"])


@router.get("/api/labels", response_model=list[LabelResponse])
def list_labels(db: Session = Depends(get_db)):
    return db.query(Label).order_by(Label.name).all()


@router.post("/api/labels", response_model=LabelResponse, status_code=201)
def create_label(req: LabelCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(Label).filter(Label.name == req.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Label '{req.name}' already exists")
    label = Label(name=req.name, color=req.color, description=req.description)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


@router.delete("/api/labels/{label_id}")
def delete_label(label_id: int, db: Session = Depends(get_db)):
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    db.delete(label)
    db.commit()
    return {"message": "Label deleted"}


@router.post("/api/repos/{repo_id}/prs/{pr_id}/labels")
def add_label_to_pr(repo_id: str, pr_id: int, req: dict, db: Session = Depends(get_db)):
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")
    label_id = req.get("label_id")
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    existing = db.query(PRLabel).filter(PRLabel.pr_id == pr_id, PRLabel.label_id == label_id).first()
    if existing:
        return {"message": "Label already added"}
    db.add(PRLabel(pr_id=pr_id, label_id=label_id))
    db.commit()
    return {"message": "Label added"}


@router.delete("/api/repos/{repo_id}/prs/{pr_id}/labels/{label_id}")
def remove_label_from_pr(repo_id: str, pr_id: int, label_id: int, db: Session = Depends(get_db)):
    pr_label = db.query(PRLabel).filter(PRLabel.pr_id == pr_id, PRLabel.label_id == label_id).first()
    if not pr_label:
        raise HTTPException(status_code=404, detail="Label not on this PR")
    db.delete(pr_label)
    db.commit()
    return {"message": "Label removed"}
