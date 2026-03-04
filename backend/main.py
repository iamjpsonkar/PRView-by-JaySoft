from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routes import repos, branches, prs, diffs, commits, comments, reviews, merge

app = FastAPI(title="PRView API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    from app.config import SERVER_PORT
    uvicorn.run("main:app", host="0.0.0.0", port=SERVER_PORT, reload=True)
