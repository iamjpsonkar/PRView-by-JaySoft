import hashlib
import os

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Repository
from app.schemas import RepoValidateRequest, RepoValidateResponse, RepoSelectResponse, RepoInfo, DirEntry
from app.services.git_service import GitService

router = APIRouter(prefix="/api/repos", tags=["repos"])


@router.post("/validate", response_model=RepoValidateResponse)
def validate_repo(req: RepoValidateRequest):
    path = os.path.expanduser(req.path)
    valid, error = GitService.validate_repo(path)
    if not valid:
        return RepoValidateResponse(valid=False, error=error)

    from git import Repo
    repo = Repo(path)
    branches = GitService.get_branches(repo)
    return RepoValidateResponse(
        valid=True,
        name=os.path.basename(path),
        branch_count=len(branches),
    )


@router.post("/select", response_model=RepoSelectResponse)
def select_repo(req: RepoValidateRequest, db: Session = Depends(get_db)):
    path = os.path.expanduser(req.path)
    valid, error = GitService.validate_repo(path)
    if not valid:
        raise ValueError(error)

    repo_id = hashlib.sha256(os.path.abspath(path).encode()).hexdigest()[:12]
    name = os.path.basename(os.path.abspath(path))

    existing = db.query(Repository).filter(Repository.id == repo_id).first()
    if existing:
        from datetime import datetime, timezone
        existing.last_opened = datetime.now(timezone.utc)
        db.commit()
    else:
        repo = Repository(id=repo_id, path=os.path.abspath(path), name=name)
        db.add(repo)
        db.commit()

    return RepoSelectResponse(repo_id=repo_id, name=name, path=os.path.abspath(path))


@router.get("/recent", response_model=list[RepoInfo])
def get_recent_repos(db: Session = Depends(get_db)):
    repos = db.query(Repository).order_by(Repository.last_opened.desc()).limit(10).all()
    return repos


@router.get("/browse")
def browse_dirs(path: str = "~"):
    target = os.path.expanduser(path)
    if not os.path.isdir(target):
        return []

    entries = []
    try:
        for name in sorted(os.listdir(target)):
            if name.startswith('.') and name != '.git':
                continue
            full = os.path.join(target, name)
            if os.path.isdir(full):
                is_git = os.path.isdir(os.path.join(full, '.git'))
                entries.append(DirEntry(name=name, path=full, is_dir=True, is_git_repo=is_git))
    except PermissionError:
        pass
    return entries
