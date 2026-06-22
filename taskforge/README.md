# TaskForge

Distributed job processing platform built with FastAPI, Redis, PostgreSQL, and React. Submit background jobs, monitor execution across a worker pool, retry failures, schedule recurring tasks, and track everything from a real-time dashboard.

![Stack](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square) ![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square) ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square) ![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square)

---

## Architecture

```
┌─────────────────────────────────┐
│         React Frontend          │
│  Dashboard · Jobs · Workers     │
│  Schedules · Real-time Charts   │
└────────────────┬────────────────┘
                 │ REST API
┌────────────────▼────────────────┐
│         FastAPI Backend         │
│  /api/jobs  /api/workers        │
│  /api/metrics  /api/schedules   │
└──────┬──────────────────┬───────┘
       │                  │
┌──────▼──────┐  ┌────────▼────────┐
│ Redis Queue │  │  PostgreSQL DB  │
│  High lane  │  │  Jobs · Logs    │
│  Normal     │  │  Schedules      │
│  Low + DLQ  │  └─────────────────┘
└──────┬──────┘
       │
  ┌────┴────┐
  │ Workers │  (3 async workers, configurable)
  └─────────┘
```

---

## Features

- **Priority queuing** — three lanes (high / normal / low) backed by Redis, workers always drain high first
- **Retry logic** — configurable max retries per job, automatic re-enqueue on failure
- **Dead letter queue** — jobs that exhaust retries go to DLQ, inspectable and manually retriable
- **Worker health monitoring** — heartbeat-based detection, CPU/memory per worker, offline detection after 15s
- **Scheduling** — cron expressions and one-time future execution
- **Real-time dashboard** — live charts for jobs/min, failures, worker utilization, queue latency
- **Job detail view** — logs, result, payload, execution time, assigned worker, retry history
- **Full REST API** — documented at `/docs` (Swagger UI)

---

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/yourusername/taskforge
cd taskforge
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

### Local development

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Requires Redis and PostgreSQL running locally. Connection strings go in `backend/.env`.

---

## API

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/jobs/` | List jobs, filter by `?status=` |
| `POST` | `/api/jobs/` | Submit a job |
| `GET` | `/api/jobs/{id}` | Job detail, logs, result |
| `DELETE` | `/api/jobs/{id}` | Cancel a job |
| `POST` | `/api/jobs/{id}/retry` | Retry failed or dead job |
| `GET` | `/api/jobs/dlq/list` | Dead letter queue |

**Submit a job**

```bash
curl -X POST http://localhost:8000/api/jobs/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Generate Q4 Report",
    "priority": "high",
    "execution_type": "report_gen",
    "payload": { "region": "Midwest", "year": 2025 },
    "max_retries": 3
  }'
```

### Workers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workers/` | All workers with health status |
| `GET` | `/api/workers/{id}` | Single worker |

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/metrics/` | Dashboard data + time series |
| `GET` | `/api/metrics/summary` | Job counts by status |

### Schedules

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/schedules/` | List schedules |
| `POST` | `/api/schedules/` | Create schedule |
| `DELETE` | `/api/schedules/{id}` | Delete schedule |
| `PATCH` | `/api/schedules/{id}/toggle` | Pause or resume |

---

## Project Structure

```
taskforge/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── jobs.py
│   │   │   ├── workers.py
│   │   │   ├── metrics.py
│   │   │   └── schedules.py
│   │   ├── core/
│   │   │   ├── database.py
│   │   │   └── redis.py
│   │   ├── models/
│   │   │   └── job.py
│   │   ├── schemas/
│   │   │   └── job.py
│   │   ├── workers/
│   │   │   └── processor.py
│   │   └── main.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── lib/api.ts
│   │   ├── types/index.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Jobs.tsx
│   │   │   ├── Workers.tsx
│   │   │   └── Schedules.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| API | FastAPI 0.115, Python 3.12 |
| Queue | Redis 7, three-lane priority + DLQ |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| Workers | asyncio, heartbeat monitoring |
| Frontend | React 18, TypeScript, Vite |
| Charts | Recharts |
| Containers | Docker, docker-compose |

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and set:

```env
DATABASE_URL=postgresql+asyncpg://taskforge:taskforge@localhost:5432/taskforge
REDIS_URL=redis://localhost:6379
NUM_WORKERS=3
```

---

## License

MIT
