from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Repository
from app.schemas import BranchInfo
from app.services.git_service import GitService

router = APIRouter(prefix="/api/repos/{repo_id}", tags=["branches"])


def get_repo_path(repo_id: str, db: Session = Depends(get_db)) -> str:
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo.path


@router.get("/branches", response_model=list[BranchInfo])
def list_branches(
    repo_path: str = Depends(get_repo_path),
    search: Optional[str] = Query(None, description="Filter branches by name (case-insensitive)"),
    limit: int = Query(100, ge=1, le=10000, description="Max branches to return"),
):
    repo = GitService.get_repo(repo_path)
    return GitService.get_branches(repo, search=search, limit=limit)
