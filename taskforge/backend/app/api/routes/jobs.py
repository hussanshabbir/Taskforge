from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.redis import redis_client
from app.models.job import Job, JobStatus
from app.schemas.job import JobCreate, JobResponse, JobUpdate

router = APIRouter()


@router.post("/", response_model=JobResponse)
async def create_job(job_in: JobCreate, db: AsyncSession = Depends(get_db)):
    job = Job(
        name=job_in.name,
        priority=job_in.priority.value,
        execution_type=job_in.execution_type,
        payload=job_in.payload,
        max_retries=job_in.max_retries,
        scheduled_at=job_in.scheduled_at,
        status=JobStatus.SCHEDULED if job_in.scheduled_at else JobStatus.QUEUED,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    if not job_in.scheduled_at:
        await redis_client.push_job(
            {"job_id": job.id, "name": job.name, "execution_type": job.execution_type, "payload": job.payload, "max_retries": job.max_retries},
            priority=job_in.priority.value,
        )
        await redis_client.increment_metric("jobs_queued")

    return job


@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    q = select(Job).order_by(desc(Job.created_at)).limit(limit).offset(offset)
    if status:
        q = q.where(Job.status == status)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}")
async def cancel_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status in [JobStatus.RUNNING]:
        raise HTTPException(status_code=400, detail="Cannot cancel a running job")
    job.status = JobStatus.DEAD
    await db.commit()
    return {"message": "Job cancelled"}


@router.post("/{job_id}/retry")
async def retry_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in [JobStatus.FAILED, JobStatus.DEAD]:
        raise HTTPException(status_code=400, detail="Only failed or dead jobs can be retried")
    job.status = JobStatus.QUEUED
    job.retries = 0
    job.error = None
    await db.commit()
    await redis_client.push_job(
        {"job_id": job.id, "name": job.name, "execution_type": job.execution_type, "payload": job.payload, "max_retries": job.max_retries},
        priority=job.priority,
    )
    return {"message": "Job requeued"}


@router.get("/dlq/list")
async def get_dlq():
    return await redis_client.get_dlq_jobs()
