from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Webhook
from app.schemas import WebhookCreateRequest, WebhookResponse
from app.services.webhook_service import VALID_EVENTS

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.get("", response_model=list[WebhookResponse])
def list_webhooks(db: Session = Depends(get_db)):
    webhooks = db.query(Webhook).order_by(Webhook.created_at.desc()).all()
    return [
        {"id": w.id, "url": w.url, "events": w.events.split(","),
         "active": bool(w.active), "created_at": w.created_at}
        for w in webhooks
    ]


@router.post("", response_model=WebhookResponse, status_code=201)
def create_webhook(req: WebhookCreateRequest, db: Session = Depends(get_db)):
    for event in req.events:
        if event != "*" and event not in VALID_EVENTS:
            raise HTTPException(status_code=400, detail=f"Invalid event: {event}. Valid: {VALID_EVENTS}")
    wh = Webhook(url=req.url, events=",".join(req.events), secret=req.secret)
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return {"id": wh.id, "url": wh.url, "events": wh.events.split(","),
            "active": bool(wh.active), "created_at": wh.created_at}


@router.delete("/{webhook_id}")
def delete_webhook(webhook_id: int, db: Session = Depends(get_db)):
    wh = db.query(Webhook).filter(Webhook.id == webhook_id).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    db.delete(wh)
    db.commit()
    return {"message": "Webhook deleted"}
