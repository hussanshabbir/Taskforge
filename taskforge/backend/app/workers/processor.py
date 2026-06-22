import asyncio
import random
import uuid
import os
from datetime import datetime
from typing import Optional

from app.core.redis import redis_client
from app.core.database import AsyncSessionLocal
from app.models.job import Job, JobStatus

NUM_WORKERS = int(os.getenv("NUM_WORKERS", "3"))


class Worker:
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.jobs_completed = 0
        self.current_job: Optional[str] = None
        self.running = True

    async def heartbeat(self):
        while self.running:
            await redis_client.set_worker_heartbeat(self.worker_id, {
                "worker_id": self.worker_id,
                "status": "busy" if self.current_job else "idle",
                "current_job": self.current_job,
                "cpu_usage": round(random.uniform(15, 85), 1),
                "memory_usage": round(random.uniform(30, 70), 1),
                "jobs_completed": self.jobs_completed,
                "last_heartbeat": datetime.utcnow().isoformat(),
            })
            await asyncio.sleep(5)

    async def execute_job(self, job_data: dict) -> tuple[bool, str, Optional[dict]]:
        """Simulate job execution. Returns (success, logs, result)."""
        exec_type = job_data.get("execution_type", "python_script")
        payload = job_data.get("payload", {})

        await asyncio.sleep(random.uniform(0.5, 3.0))

        if random.random() < 0.08:
            return False, f"[ERROR] Job execution failed: timeout or runtime error\n[{datetime.utcnow().isoformat()}] Process exited with code 1", None

        logs = (
            f"[{datetime.utcnow().isoformat()}] Worker {self.worker_id} picked up job\n"
            f"[{datetime.utcnow().isoformat()}] Execution type: {exec_type}\n"
            f"[{datetime.utcnow().isoformat()}] Payload: {payload}\n"
            f"[{datetime.utcnow().isoformat()}] Processing...\n"
            f"[{datetime.utcnow().isoformat()}] Job completed successfully\n"
        )
        result = {"output": f"Processed by {self.worker_id}", "records": random.randint(100, 10000)}
        return True, logs, result

    async def process(self):
        while self.running:
            job_data = await redis_client.pop_job()
            if not job_data:
                await asyncio.sleep(1)
                continue

            job_id = job_data.get("job_id")
            self.current_job = job_id
            start_time = datetime.utcnow()

            async with AsyncSessionLocal() as db:
                from sqlalchemy import select
                result = await db.execute(select(Job).where(Job.id == job_id))
                job = result.scalar_one_or_none()

                if not job:
                    self.current_job = None
                    continue

                job.status = JobStatus.RUNNING
                job.worker_id = self.worker_id
                job.started_at = start_time
                await db.commit()

                success, logs, exec_result = await self.execute_job(job_data)
                elapsed_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

                result = await db.execute(select(Job).where(Job.id == job_id))
                job = result.scalar_one_or_none()

                if success:
                    job.status = JobStatus.COMPLETED
                    job.logs = logs
                    job.result = exec_result
                    job.execution_time_ms = elapsed_ms
                    job.completed_at = datetime.utcnow()
                    self.jobs_completed += 1
                    await redis_client.increment_metric("jobs_completed")
                else:
                    job.retries = (job.retries or 0) + 1
                    if job.retries < job.max_retries:
                        job.status = JobStatus.RETRYING
                        job.logs = logs
                        await db.commit()
                        await redis_client.push_job(job_data, priority=job.priority or "normal")
                    else:
                        job.status = JobStatus.FAILED
                        job.error = logs
                        job.execution_time_ms = elapsed_ms
                        job.completed_at = datetime.utcnow()
                        await redis_client.push_dlq({**job_data, "error": logs})
                        await redis_client.increment_metric("jobs_failed")

                await db.commit()

            self.current_job = None


async def start_workers():
    workers = [Worker(f"worker-{i+1}") for i in range(NUM_WORKERS)]
    tasks = []
    for w in workers:
        tasks.append(asyncio.create_task(w.heartbeat()))
        tasks.append(asyncio.create_task(w.process()))
    await asyncio.gather(*tasks, return_exceptions=True)
