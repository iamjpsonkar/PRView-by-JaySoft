from fastapi import Request


def get_current_user(request: Request) -> str:
    """Extract display name from X-PRView-User header, default to 'local-user'."""
    return request.headers.get("X-PRView-User", "local-user")
