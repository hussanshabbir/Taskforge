export type JobStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'retrying' | 'dead' | 'scheduled'
export type JobPriority = 'high' | 'normal' | 'low'

export interface Job {
  id: string
  name: string
  status: JobStatus
  priority: JobPriority
  execution_type: string
  payload: Record<string, unknown>
  result?: unknown
  logs?: string
  error?: string
  retries: number
  max_retries: number
  worker_id?: string
  execution_time_ms?: number
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface Worker {
  worker_id: string
  status: 'healthy' | 'busy' | 'offline' | 'idle'
  current_job?: string
  cpu_usage: number
  memory_usage: number
  jobs_completed: number
  last_heartbeat: string
}

export interface Metrics {
  active_workers: number
  jobs_processed_today: number
  queue_depth: number
  success_rate: number
  queue_depths: Record<string, number>
  jobs_per_minute: Array<{ time: string; value: number }>
  failed_jobs_timeline: Array<{ time: string; value: number }>
  worker_utilization: Array<{ time: string; value: number }>
  queue_latency: Array<{ time: string; value: number }>
}

export interface Schedule {
  id: string
  name: string
  cron_expression?: string
  run_once_at?: string
  job_template: Record<string, unknown>
  is_active: number
  last_run?: string
  next_run?: string
  created_at: string
}

export interface JobCreate {
  name: string
  priority: JobPriority
  execution_type: string
  payload: Record<string, unknown>
  max_retries: number
  scheduled_at?: string
}
