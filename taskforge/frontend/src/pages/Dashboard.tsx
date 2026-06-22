import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Activity, Layers, CheckCircle, Cpu, AlertTriangle } from 'lucide-react'
import { api } from '../lib/api'
import type { Metrics } from '../types'

const TooltipStyle = {
  contentStyle: { background: '#111318', border: '1px solid #1e2028', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#6b7280' },
  itemStyle: { color: '#e8eaf0' },
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await api.metrics.get()
      setMetrics(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="page-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading metrics...</div>
    </div>
  )

  if (!metrics) return (
    <div className="page-body">
      <div className="empty-state">
        <div className="empty-icon">⚠️</div>
        <div className="empty-title">API Unreachable</div>
        <div className="empty-desc">Make sure the FastAPI backend is running on port 8000</div>
      </div>
    </div>
  )

  return (
    <div className="page-body">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Workers</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{metrics.active_workers}</div>
          <div className="stat-meta up">↑ processing now</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Jobs Today</div>
          <div className="stat-value">{metrics.jobs_processed_today.toLocaleString()}</div>
          <div className="stat-meta">completed successfully</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Queue Depth</div>
          <div className="stat-value" style={{ color: metrics.queue_depth > 100 ? 'var(--yellow)' : 'var(--text)' }}>
            {metrics.queue_depth}
          </div>
          <div className="stat-meta">
            H:{metrics.queue_depths.high} N:{metrics.queue_depths.normal} L:{metrics.queue_depths.low}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Success Rate</div>
          <div className="stat-value" style={{ color: metrics.success_rate >= 98 ? 'var(--green)' : metrics.success_rate >= 90 ? 'var(--yellow)' : 'var(--red)' }}>
            {metrics.success_rate}%
          </div>
          <div className="stat-meta up">↑ last 24h</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Jobs / Minute</span>
            <Activity size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={metrics.jobs_per_minute}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#g1)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Failed Jobs</span>
            <AlertTriangle size={14} style={{ color: 'var(--red)' }} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={metrics.failed_jobs_timeline}>
              <defs>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="#ef4444" fill="url(#g2)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Worker Utilization %</span>
            <Cpu size={14} style={{ color: 'var(--blue)' }} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={metrics.worker_utilization}>
              <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TooltipStyle} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Queue Latency (s)</span>
            <Layers size={14} style={{ color: 'var(--yellow)' }} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={metrics.queue_latency}>
              <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip {...TooltipStyle} />
              <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Queue Overview</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'High Priority', count: metrics.queue_depths.high, color: 'var(--red)' },
            { label: 'Normal Priority', count: metrics.queue_depths.normal, color: 'var(--blue)' },
            { label: 'Low Priority', count: metrics.queue_depths.low, color: 'var(--text-muted)' },
            { label: 'Dead Letter', count: metrics.queue_depths.dlq, color: 'var(--yellow)' },
          ].map(q => (
            <div key={q.label} style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{q.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: q.color }}>{q.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
