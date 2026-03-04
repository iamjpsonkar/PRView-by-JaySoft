import logging
from datetime import datetime, timezone

import httpx

from app.database import SessionLocal
from app.models import Webhook

logger = logging.getLogger(__name__)

VALID_EVENTS = {"pr.created", "pr.updated", "pr.merged", "comment.created", "review.created"}


def fire_webhooks(event: str, payload: dict):
    db = SessionLocal()
    try:
        webhooks = db.query(Webhook).filter(Webhook.active == 1).all()
        for wh in webhooks:
            events = wh.events.split(",")
            if event not in events and "*" not in events:
                continue
            try:
                httpx.post(
                    wh.url,
                    json={"event": event, "timestamp": datetime.now(timezone.utc).isoformat(), "payload": payload},
                    timeout=5.0,
                )
            except Exception as e:
                logger.warning(f"Webhook {wh.id} to {wh.url} failed: {e}")
    finally:
        db.close()
