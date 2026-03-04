from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Repository, PullRequest
from app.schemas import DiffFileInfo, DiffStats, DiffFileResponse
from app.services.git_service import GitService

router = APIRouter(prefix="/api/repos/{repo_id}/prs/{pr_id}/diff", tags=["diffs"])


def get_pr_and_repo(repo_id: str, pr_id: int, db: Session):
    repo_record = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull request not found")
    return pr, GitService.get_repo(repo_record.path)


@router.get("/files", response_model=list[DiffFileInfo])
def get_changed_files(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    pr, repo = get_pr_and_repo(repo_id, pr_id, db)
    files = GitService.get_changed_files(repo, pr.source_branch, pr.target_branch)
    return files


@router.get("/file", response_model=DiffFileResponse)
def get_file_diff(repo_id: str, pr_id: int, path: str = Query(...), db: Session = Depends(get_db)):
    pr, repo = get_pr_and_repo(repo_id, pr_id, db)
    diff_text = GitService.get_file_diff(repo, pr.source_branch, pr.target_branch, path)
    files = GitService.get_changed_files(repo, pr.source_branch, pr.target_branch)
    status = "modified"
    for f in files:
        if f["path"] == path:
            status = f["status"]
            break
    return DiffFileResponse(path=path, diff_text=diff_text, status=status)


@router.get("/stats", response_model=DiffStats)
def get_diff_stats(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    pr, repo = get_pr_and_repo(repo_id, pr_id, db)
    return GitService.get_diff_stats(repo, pr.source_branch, pr.target_branch)


@router.get("/full")
def get_full_diff(repo_id: str, pr_id: int, db: Session = Depends(get_db)):
    pr, repo = get_pr_and_repo(repo_id, pr_id, db)
    diff_text = GitService.get_diff_text(repo, pr.source_branch, pr.target_branch)
    return {"diff_text": diff_text}


@router.get("/blame")
def get_blame(repo_id: str, pr_id: int, path: str = Query(...), db: Session = Depends(get_db)):
    repo_record = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo_record:
        raise HTTPException(status_code=404, detail="Repository not found")
    pr = db.query(PullRequest).filter(PullRequest.id == pr_id, PullRequest.repo_id == repo_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="PR not found")

    repo = GitService.get_repo(repo_record.path)
    try:
        commit = repo.heads[pr.source_branch].commit
        blame_data = repo.blame(commit, path)
        result = []
        line_num = 1
        for blame_commit, lines in blame_data:
            for line in lines:
                result.append({
                    "line": line_num,
                    "sha": blame_commit.hexsha[:8],
                    "full_sha": blame_commit.hexsha,
                    "author": blame_commit.author.name,
                    "date": blame_commit.authored_datetime.isoformat(),
                    "message": blame_commit.message.split('\n')[0][:80],
                    "content": line.decode('utf-8', errors='replace') if isinstance(line, bytes) else str(line),
                })
                line_num += 1
        return {"path": path, "lines": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
