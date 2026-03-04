from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Repository
from app.services.git_service import GitService

router = APIRouter(prefix="/api/repos/{repo_id}/compare", tags=["compare"])


def get_repo(repo_id: str, db: Session) -> tuple:
    repo_record = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo_record, GitService.get_repo(repo_record.path)


@router.get("/{source}...{target}/stats")
def compare_stats(repo_id: str, source: str, target: str, db: Session = Depends(get_db)):
    _, repo = get_repo(repo_id, db)
    try:
        stats = GitService.get_diff_stats(repo, source, target)
        return stats
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{source}...{target}/files")
def compare_files(repo_id: str, source: str, target: str, db: Session = Depends(get_db)):
    _, repo = get_repo(repo_id, db)
    try:
        files = GitService.get_changed_files(repo, source, target)
        return files
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{source}...{target}/commits")
def compare_commits(repo_id: str, source: str, target: str, db: Session = Depends(get_db)):
    _, repo = get_repo(repo_id, db)
    try:
        commits = GitService.get_commits_between(repo, source, target)
        return commits
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{source}...{target}/diff")
def compare_full_diff(repo_id: str, source: str, target: str, db: Session = Depends(get_db)):
    _, repo = get_repo(repo_id, db)
    try:
        diff_text = GitService.get_diff_text(repo, source, target)
        return {"diff_text": diff_text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{source}...{target}/diff/file")
def compare_file_diff(repo_id: str, source: str, target: str, path: str = Query(...), db: Session = Depends(get_db)):
    _, repo = get_repo(repo_id, db)
    try:
        diff_text = GitService.get_file_diff(repo, source, target, path)
        return {"path": path, "diff_text": diff_text}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
