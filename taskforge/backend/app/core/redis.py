import redis.asyncio as aioredis
import os
import json
from typing import Optional, Any

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

QUEUE_HIGH = "taskforge:queue:high"
QUEUE_NORMAL = "taskforge:queue:normal"
QUEUE_LOW = "taskforge:queue:low"
DEAD_LETTER_QUEUE = "taskforge:dlq"
WORKER_HEARTBEAT_KEY = "taskforge:workers"
METRICS_KEY = "taskforge:metrics"


class RedisClient:
    def __init__(self):
        self.client: Optional[aioredis.Redis] = None

    async def connect(self):
        self.client = aioredis.from_url(REDIS_URL, decode_responses=True)

    async def disconnect(self):
        if self.client:
            await self.client.aclose()

    async def push_job(self, job_data: dict, priority: str = "normal") -> bool:
        queue = {
            "high": QUEUE_HIGH,
            "normal": QUEUE_NORMAL,
            "low": QUEUE_LOW,
        }.get(priority, QUEUE_NORMAL)
        await self.client.lpush(queue, json.dumps(job_data))
        return True

    async def pop_job(self) -> Optional[dict]:
        for queue in [QUEUE_HIGH, QUEUE_NORMAL, QUEUE_LOW]:
            result = await self.client.rpop(queue)
            if result:
                return json.loads(result)
        return None

    async def push_dlq(self, job_data: dict):
        await self.client.lpush(DEAD_LETTER_QUEUE, json.dumps(job_data))

    async def get_dlq_jobs(self) -> list:
        items = await self.client.lrange(DEAD_LETTER_QUEUE, 0, -1)
        return [json.loads(i) for i in items]

    async def get_queue_depths(self) -> dict:
        return {
            "high": await self.client.llen(QUEUE_HIGH),
            "normal": await self.client.llen(QUEUE_NORMAL),
            "low": await self.client.llen(QUEUE_LOW),
            "dlq": await self.client.llen(DEAD_LETTER_QUEUE),
        }

    async def set_worker_heartbeat(self, worker_id: str, data: dict):
        await self.client.hset(WORKER_HEARTBEAT_KEY, worker_id, json.dumps(data))
        await self.client.expire(WORKER_HEARTBEAT_KEY, 30)

    async def get_all_workers(self) -> dict:
        raw = await self.client.hgetall(WORKER_HEARTBEAT_KEY)
        return {k: json.loads(v) for k, v in raw.items()}

    async def increment_metric(self, key: str, amount: int = 1):
        await self.client.hincrby(METRICS_KEY, key, amount)

    async def get_metrics(self) -> dict:
        raw = await self.client.hgetall(METRICS_KEY)
        return {k: int(v) for k, v in raw.items()}

    async def set(self, key: str, value: Any, ex: int = None):
        await self.client.set(key, json.dumps(value), ex=ex)

    async def get(self, key: str) -> Any:
        val = await self.client.get(key)
        return json.loads(val) if val else None


redis_client = RedisClient()
