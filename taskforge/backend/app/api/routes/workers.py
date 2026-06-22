from fastapi import APIRouter
from app.core.redis import redis_client
from datetime import datetime

router = APIRouter()


@router.get("/")
async def list_workers():
    workers = await redis_client.get_all_workers()
    result = []
    for worker_id, data in workers.items():
        last_hb = datetime.fromisoformat(data.get("last_heartbeat", datetime.utcnow().isoformat()))
        age_s = (datetime.utcnow() - last_hb).total_seconds()
        data["status"] = "healthy" if age_s < 15 else "offline"
        data["worker_id"] = worker_id
        result.append(data)
    return result


@router.get("/{worker_id}")
async def get_worker(worker_id: str):
    workers = await redis_client.get_all_workers()
    if worker_id not in workers:
        return {"error": "Worker not found"}
    data = workers[worker_id]
    last_hb = datetime.fromisoformat(data.get("last_heartbeat", datetime.utcnow().isoformat()))
    age_s = (datetime.utcnow() - last_hb).total_seconds()
    data["status"] = "healthy" if age_s < 15 else "offline"
    data["worker_id"] = worker_id
    return data
