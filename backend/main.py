from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes import repos, branches, prs, diffs, commits, comments, reviews, merge, labels, compare, webhooks, checklist

app = FastAPI(title="PRView API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5121", "http://127.0.0.1:5121", "null"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repos.router)
app.include_router(branches.router)
app.include_router(prs.router)
app.include_router(diffs.router)
app.include_router(commits.router)
app.include_router(comments.router)
app.include_router(reviews.router)
app.include_router(merge.router)
app.include_router(labels.router)
app.include_router(compare.router)
app.include_router(webhooks.router)
app.include_router(checklist.router)


def seed_default_labels():
    from app.database import SessionLocal
    from app.models import Label
    db = SessionLocal()
    try:
        if db.query(Label).count() == 0:
            defaults = [
                Label(name="bug", color="#d13438", description="Something isn't working"),
                Label(name="feature", color="#0078d4", description="New feature request"),
                Label(name="breaking-change", color="#ca5010", description="Breaking change"),
                Label(name="WIP", color="#ffd700", description="Work in progress"),
                Label(name="docs", color="#107c10", description="Documentation update"),
            ]
            db.add_all(defaults)
            db.commit()
    finally:
        db.close()


def migrate_db():
    from sqlalchemy import text
    from app.database import engine
    migrations = [
        "ALTER TABLE comments ADD COLUMN suggestion TEXT",
        "ALTER TABLE comments ADD COLUMN suggestion_applied INTEGER DEFAULT 0",
        "ALTER TABLE comments ADD COLUMN is_ai_generated INTEGER DEFAULT 0",
        "ALTER TABLE comments ADD COLUMN ai_agent_name TEXT",
        "ALTER TABLE reviews ADD COLUMN is_ai_generated INTEGER DEFAULT 0",
        "ALTER TABLE reviews ADD COLUMN ai_agent_name TEXT",
        "ALTER TABLE pull_requests ADD COLUMN ai_summary TEXT",
        "ALTER TABLE pull_requests ADD COLUMN ai_summary_agent TEXT",
        "ALTER TABLE pull_requests ADD COLUMN ai_summary_updated_at DATETIME",
    ]
    with engine.connect() as conn:
        for stmt in migrations:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass


@app.on_event("startup")
def startup():
    init_db()
    seed_default_labels()
    migrate_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    from app.config import SERVER_PORT
    uvicorn.run("main:app", host="0.0.0.0", port=SERVER_PORT, reload=True)
