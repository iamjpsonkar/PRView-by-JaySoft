import os
from typing import Optional

from git import Repo, InvalidGitRepositoryError


class GitService:
    _instances: dict[str, Repo] = {}

    @classmethod
    def get_repo(cls, repo_path: str) -> Repo:
        if repo_path not in cls._instances:
            cls._instances[repo_path] = Repo(repo_path)
        return cls._instances[repo_path]

    @classmethod
    def clear_cache(cls, repo_path: str):
        cls._instances.pop(repo_path, None)

    @staticmethod
    def validate_repo(path: str) -> tuple[bool, Optional[str]]:
        if not os.path.isdir(path):
            return False, "Path does not exist or is not a directory"
        try:
            Repo(path)
            return True, None
        except InvalidGitRepositoryError:
            return False, "Not a valid git repository"
        except Exception as e:
            return False, str(e)

    @staticmethod
    def get_branches(repo: Repo) -> list[dict]:
        branches = []
        for ref in repo.references:
            if hasattr(ref, 'tracking_branch') or ref.path.startswith('refs/heads/'):
                try:
                    commit = ref.commit
                    branches.append({
                        "name": ref.name,
                        "is_current": ref.name == repo.active_branch.name if not repo.head.is_detached else False,
                        "commit_sha": str(commit.hexsha),
                        "commit_message": commit.message.strip().split('\n')[0][:100],
                    })
                except Exception:
                    continue
        return branches

    @staticmethod
    def get_merge_base(repo: Repo, source: str, target: str) -> Optional[str]:
        try:
            result = repo.git.merge_base(target, source)
            return result.strip()
        except Exception:
            return None

    @staticmethod
    def get_diff_text(repo: Repo, source: str, target: str) -> str:
        merge_base = GitService.get_merge_base(repo, source, target)
        if merge_base:
            return repo.git.diff(merge_base, source, unified=3)
        return repo.git.diff(target, source, unified=3)

    @staticmethod
    def get_file_diff(repo: Repo, source: str, target: str, file_path: str) -> str:
        merge_base = GitService.get_merge_base(repo, source, target)
        if merge_base:
            return repo.git.diff(merge_base, source, "--", file_path, unified=3)
        return repo.git.diff(target, source, "--", file_path, unified=3)

    @staticmethod
    def get_changed_files(repo: Repo, source: str, target: str) -> list[dict]:
        merge_base = GitService.get_merge_base(repo, source, target)
        base = merge_base if merge_base else target

        numstat = repo.git.diff(base, source, numstat=True)
        name_status = repo.git.diff(base, source, name_status=True)

        status_map = {}
        for line in name_status.strip().split('\n'):
            if not line.strip():
                continue
            parts = line.split('\t')
            if len(parts) >= 2:
                status_code = parts[0][0]
                file_name = parts[-1]
                old_name = parts[1] if len(parts) == 3 else None
                status_str = {
                    'A': 'added', 'M': 'modified', 'D': 'deleted',
                    'R': 'renamed', 'C': 'copied'
                }.get(status_code, 'modified')
                status_map[file_name] = {"status": status_str, "old_path": old_name}

        files = []
        for line in numstat.strip().split('\n'):
            if not line.strip():
                continue
            parts = line.split('\t')
            if len(parts) >= 3:
                insertions = int(parts[0]) if parts[0] != '-' else 0
                deletions = int(parts[1]) if parts[1] != '-' else 0
                file_path = parts[2]
                info = status_map.get(file_path, {"status": "modified", "old_path": None})
                files.append({
                    "path": file_path,
                    "status": info["status"],
                    "insertions": insertions,
                    "deletions": deletions,
                    "old_path": info.get("old_path"),
                })
        return files

    @staticmethod
    def get_diff_stats(repo: Repo, source: str, target: str) -> dict:
        merge_base = GitService.get_merge_base(repo, source, target)
        base = merge_base if merge_base else target
        stat = repo.git.diff(base, source, stat=True)
        shortstat = repo.git.diff(base, source, shortstat=True)

        files_changed = 0
        insertions = 0
        deletions = 0

        if shortstat.strip():
            import re
            m = re.search(r'(\d+) files? changed', shortstat)
            if m:
                files_changed = int(m.group(1))
            m = re.search(r'(\d+) insertions?', shortstat)
            if m:
                insertions = int(m.group(1))
            m = re.search(r'(\d+) deletions?', shortstat)
            if m:
                deletions = int(m.group(1))

        return {
            "files_changed": files_changed,
            "insertions": insertions,
            "deletions": deletions,
        }

    @staticmethod
    def get_commits_between(repo: Repo, source: str, target: str) -> list[dict]:
        merge_base = GitService.get_merge_base(repo, source, target)
        base = merge_base if merge_base else target

        commits = []
        for commit in repo.iter_commits(f"{base}..{source}"):
            commits.append({
                "sha": str(commit.hexsha),
                "short_sha": str(commit.hexsha)[:7],
                "message": commit.message.strip(),
                "author_name": commit.author.name,
                "author_email": commit.author.email,
                "authored_date": commit.authored_datetime.isoformat(),
                "files_changed": len(commit.stats.files),
            })
        return commits

    @staticmethod
    def get_commit_diff(repo: Repo, sha: str) -> str:
        return repo.git.diff(f"{sha}~1", sha, unified=3)

    @staticmethod
    def check_conflicts(repo: Repo, source: str, target: str) -> tuple[bool, list[str]]:
        try:
            result = repo.git.merge_tree(
                repo.git.merge_base(target, source).strip(),
                target,
                source
            )
            conflicting = []
            for line in result.split('\n'):
                if 'CONFLICT' in line or '+<<<<<<<' in line:
                    conflicting.append(line)
            has_conflicts = len(conflicting) > 0
            return has_conflicts, conflicting
        except Exception:
            try:
                repo.git.merge("--no-commit", "--no-ff", source)
                repo.git.merge("--abort")
                return False, []
            except Exception as e:
                try:
                    repo.git.merge("--abort")
                except Exception:
                    pass
                error_msg = str(e)
                conflicting_files = []
                if "CONFLICT" in error_msg:
                    for line in error_msg.split('\n'):
                        if 'CONFLICT' in line:
                            conflicting_files.append(line.strip())
                return True, conflicting_files

    @staticmethod
    def execute_merge(repo: Repo, source: str, target: str, strategy: str,
                      commit_message: Optional[str] = None,
                      delete_source: bool = False) -> tuple[bool, str, Optional[str]]:
        original_branch = repo.active_branch.name if not repo.head.is_detached else None

        try:
            repo.git.checkout(target)

            if strategy == "squash":
                repo.git.merge("--squash", source)
                msg = commit_message or f"Squash merge branch '{source}' into {target}"
                repo.git.commit("-m", msg)
            elif strategy == "rebase":
                repo.git.rebase(source)
            else:  # merge commit
                msg = commit_message or f"Merge branch '{source}' into {target}"
                repo.git.merge("--no-ff", source, "-m", msg)

            merge_sha = str(repo.head.commit.hexsha)

            if delete_source:
                try:
                    repo.git.branch("-d", source)
                except Exception:
                    pass

            return True, "Merge completed successfully", merge_sha

        except Exception as e:
            try:
                repo.git.merge("--abort")
            except Exception:
                pass
            try:
                repo.git.rebase("--abort")
            except Exception:
                pass
            if original_branch:
                try:
                    repo.git.checkout(original_branch)
                except Exception:
                    pass
            return False, str(e), None
