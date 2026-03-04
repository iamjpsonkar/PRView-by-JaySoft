from datetime import datetime, timezone

from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Text, primary_key=True)
    path = Column(Text, nullable=False, unique=True)
    name = Column(Text, nullable=False)
    last_opened = Column(DateTime, default=utcnow)
    created_at = Column(DateTime, default=utcnow)

    pull_requests = relationship("PullRequest", back_populates="repository", cascade="all, delete-orphan")


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo_id = Column(Text, ForeignKey("repositories.id"), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, default="")
    source_branch = Column(Text, nullable=False)
    target_branch = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="active")
    merge_strategy = Column(Text, nullable=True)
    author = Column(Text, default="local-user")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    completed_at = Column(DateTime, nullable=True)

    repository = relationship("Repository", back_populates="pull_requests")
    comments = relationship("Comment", back_populates="pull_request", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="pull_request", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pr_id = Column(Integer, ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    file_path = Column(Text, nullable=True)
    line_number = Column(Integer, nullable=True)
    line_type = Column(Text, nullable=True)
    body = Column(Text, nullable=False)
    author = Column(Text, default="local-user")
    status = Column(Text, default="active")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    pull_request = relationship("PullRequest", back_populates="comments")
    replies = relationship("Comment", backref="parent", remote_side=[id], cascade="all, delete-orphan",
                           single_parent=True)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pr_id = Column(Integer, ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False)
    reviewer = Column(Text, default="local-user")
    vote = Column(Text, nullable=False)
    body = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)

    pull_request = relationship("PullRequest", back_populates="reviews")
