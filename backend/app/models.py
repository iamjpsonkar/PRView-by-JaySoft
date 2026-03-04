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
    ai_summary = Column(Text, nullable=True)
    ai_summary_agent = Column(Text, nullable=True)
    ai_summary_updated_at = Column(DateTime, nullable=True)

    repository = relationship("Repository", back_populates="pull_requests")
    comments = relationship("Comment", back_populates="pull_request", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="pull_request", cascade="all, delete-orphan")
    required_reviewers = relationship("RequiredReviewer", back_populates="pull_request", cascade="all, delete-orphan")
    labels = relationship("Label", secondary="pr_labels", lazy="joined")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pr_id = Column(Integer, ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    file_path = Column(Text, nullable=True)
    line_number = Column(Integer, nullable=True)
    line_type = Column(Text, nullable=True)
    body = Column(Text, nullable=False)
    suggestion = Column(Text, nullable=True)
    suggestion_applied = Column(Integer, default=0)
    is_ai_generated = Column(Integer, default=0)
    ai_agent_name = Column(Text, nullable=True)
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
    is_ai_generated = Column(Integer, default=0)
    ai_agent_name = Column(Text, nullable=True)

    pull_request = relationship("PullRequest", back_populates="reviews")


class RequiredReviewer(Base):
    __tablename__ = "required_reviewers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pr_id = Column(Integer, ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False)
    reviewer_name = Column(Text, nullable=False)

    pull_request = relationship("PullRequest", back_populates="required_reviewers")


class Label(Base):
    __tablename__ = "labels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False, unique=True)
    color = Column(Text, nullable=False, default="#0078d4")
    description = Column(Text, default="")


class PRLabel(Base):
    __tablename__ = "pr_labels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pr_id = Column(Integer, ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False)
    label_id = Column(Integer, ForeignKey("labels.id", ondelete="CASCADE"), nullable=False)


class Webhook(Base):
    __tablename__ = "webhooks"
    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(Text, nullable=False)
    events = Column(Text, nullable=False)
    secret = Column(Text, nullable=True)
    active = Column(Integer, default=1)
    created_at = Column(DateTime, default=utcnow)


class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    id = Column(Integer, primary_key=True, autoincrement=True)
    pr_id = Column(Integer, ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=False)
    label = Column(Text, nullable=False)
    checked = Column(Integer, default=0)
    details = Column(Text, nullable=True)
    category = Column(Text, nullable=True)
    author = Column(Text, default="local-user")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    pull_request = relationship("PullRequest", backref="checklist_items")
