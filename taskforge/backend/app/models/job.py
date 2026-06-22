from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Float, Enum
from sqlalchemy.sql import func
import enum
import uuid
from app.core.database import Base


def gen_id():
    return str(uuid.uuid4())[:8].upper()


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    DEAD = "dead"
    SCHEDULED = "scheduled"


class JobPriority(str, enum.Enum):
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    status = Column(String, default=JobStatus.QUEUED)
    priority = Column(String, default=JobPriority.NORMAL)
    execution_type = Column(String, default="python_script")
    payload = Column(JSON, default={})
    result = Column(JSON, nullable=True)
    logs = Column(Text, default="")
    error = Column(Text, nullable=True)
    retries = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    worker_id = Column(String, nullable=True)
    execution_time_ms = Column(Float, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(String, primary_key=True, default=gen_id)
    name = Column(String, nullable=False)
    cron_expression = Column(String, nullable=True)
    run_once_at = Column(DateTime(timezone=True), nullable=True)
    job_template = Column(JSON, nullable=False)
    is_active = Column(Integer, default=1)
    last_run = Column(DateTime(timezone=True), nullable=True)
    next_run = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
