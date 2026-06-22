from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio

from app.core.database import engine, Base
from app.core.redis import redis_client
from app.api.routes import jobs, workers, metrics, schedules
from app.workers.processor import start_workers


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await redis_client.connect()
    worker_task = asyncio.create_task(start_workers())
    yield
    worker_task.cancel()
    await redis_client.disconnect()


app = FastAPI(
    title="TaskForge API",
    description="Distributed Job Processing Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(workers.router, prefix="/api/workers", tags=["workers"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["schedules"])


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "TaskForge API"}
