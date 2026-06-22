import type { Job, Worker, Metrics, Schedule, JobCreate } from '../types'

const BASE = import.meta.env.VITE_API_URL || '/api'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

export const api = {
  jobs: {
    list: (status?: string) => req<Job[]>(`/jobs${status ? `?status=${status}` : ''}`),
    get: (id: string) => req<Job>(`/jobs/${id}`),
    create: (data: JobCreate) => req<Job>('/jobs/', { method: 'POST', body: JSON.stringify(data) }),
    retry: (id: string) => req(`/jobs/${id}/retry`, { method: 'POST' }),
    cancel: (id: string) => req(`/jobs/${id}`, { method: 'DELETE' }),
    dlq: () => req<unknown[]>('/jobs/dlq/list'),
  },

  workers: {
    list: () => req<Worker[]>('/workers/'),
    get: (id: string) => req<Worker>(`/workers/${id}`),
  },

  metrics: {
    get: () => req<Metrics>('/metrics/'),
    summary: () => req<Record<string, number>>('/metrics/summary'),
  },

  schedules: {
    list: () => req<Schedule[]>('/schedules/'),
    create: (data: unknown) => req<Schedule>('/schedules/', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => req(`/schedules/${id}`, { method: 'DELETE' }),
    toggle: (id: string) => req<Schedule>(`/schedules/${id}/toggle`, { method: 'PATCH' }),
  },
}
