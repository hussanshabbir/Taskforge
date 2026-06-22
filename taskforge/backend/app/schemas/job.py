from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from app.models.job import JobStatus, JobPriority


class JobCreate(BaseModel):
    name: str
    priority: JobPriority = JobPriority.NORMAL
    execution_type: str = "python_script"
    payload: dict = {}
    max_retries: int = 3
    scheduled_at: Optional[datetime] = None


class JobUpdate(BaseModel):
    status: Optional[JobStatus] = None
    result: Optional[Any] = None
    logs: Optional[str] = None
    error: Optional[str] = None
    worker_id: Optional[str] = None
    execution_time_ms: Optional[float] = None


class JobResponse(BaseModel):
    id: str
    name: str
    status: str
    priority: str
    execution_type: str
    payload: dict
    result: Optional[Any] = None
    logs: Optional[str] = None
    error: Optional[str] = None
    retries: int
    max_retries: int
    worker_id: Optional[str] = None
    execution_time_ms: Optional[float] = None
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScheduleCreate(BaseModel):
    name: str
    cron_expression: Optional[str] = None
    run_once_at: Optional[datetime] = None
    job_template: dict
    is_active: bool = True


class ScheduleResponse(BaseModel):
    id: str
    name: str
    cron_expression: Optional[str] = None
    run_once_at: Optional[datetime] = None
    job_template: dict
    is_active: int
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkerStatus(BaseModel):
    worker_id: str
    status: str
    current_job: Optional[str] = None
    cpu_usage: float
    memory_usage: float
    jobs_completed: int
    last_heartbeat: datetime


class MetricsResponse(BaseModel):
    active_workers: int
    jobs_processed_today: int
    queue_depth: int
    success_rate: float
    queue_depths: dict
    jobs_per_minute: list
    failed_jobs_timeline: list
    worker_utilization: list
    queue_latency: list
