import { useEffect, useState, useCallback } from 'react'
import { Plus, RefreshCw, RotateCcw, Trash2, ChevronRight, Clock, Cpu, Hash, X, Search, Filter } from 'lucide-react'
import { api } from '../lib/api'
import type { Job, JobCreate, JobPriority } from '../types'
import { formatDistanceToNow } from 'date-fns'

const EXEC_TYPES = ['python_script', 'data_pipeline', 'report_gen', 'ai_inference', 'web_scraper', 'email_batch', 'db_migration', 'etl_job']
const PRIORITIES: JobPriority[] = ['high', 'normal', 'low']
const STATUSES = ['', 'queued', 'running', 'completed', 'failed', 'retrying', 'dead', 'scheduled']

const SAMPLE_PAYLOADS: Record<string, object> = {
  python_script: { script: 'process_data.py', args: ['--region', 'us-east'], env: 'production' },
  data_pipeline: { source: 's3://bucket/raw/', destination: 's3://bucket/processed/', format: 'parquet' },
  report_gen: { report_type: 'sales_summary', region: 'Midwest', year: 2025, format: 'pdf' },
  ai_inference: { model: 'gpt-4o', batch_size: 100, input_path: '/data/inputs.jsonl' },
  web_scraper: { url: 'https://example.com', depth: 3, selectors: ['.product', '.price'] },
  email_batch: { template: 'weekly_digest', recipient_list: 'segments/active_users', send_at: 'now' },
  db_migration: { migration: '0042_add_indexes', target_db: 'prod-replica', dry_run: false },
  etl_job: { source: 'postgres://prod/orders', target: 'bigquery://dw/orders', since: '2025-01-01' },
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function PriorityIcon({ priority }: { priority: string }) {
  const colors: Record<string, string> = { high: 'var(--red)', normal: 'var(--blue)', low: 'var(--text-muted)' }
  return <span style={{ color: colors[priority] ?? 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{priority}</span>
}

function CreateJobModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<JobCreate>({
    name: '',
    priority: 'normal',
    execution_type: 'python_script',
    payload: SAMPLE_PAYLOADS.python_script,
    max_retries: 3,
  })
  const [payloadStr, setPayloadStr] = useState(JSON.stringify(SAMPLE_PAYLOADS.python_script, null, 2))
  const [payloadError, setPayloadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')

  const handleExecTypeChange = (type: string) => {
    const payload = SAMPLE_PAYLOADS[type] ?? {}
    setForm(f => ({ ...f, execution_type: type, payload }))
    setPayloadStr(JSON.stringify(payload, null, 2))
    setPayloadError('')
  }

  const handlePayloadChange = (v: string) => {
    setPayloadStr(v)
    try {
      const parsed = JSON.parse(v)
      setForm(f => ({ ...f, payload: parsed }))
      setPayloadError('')
    } catch {
      setPayloadError('Invalid JSON')
    }
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    if (payloadError) return
    setLoading(true)
    try {
      await api.jobs.create({
        ...form,
        scheduled_at: scheduleMode && scheduledAt ? scheduledAt : undefined,
      })
      onCreated()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 540 }}>
        <div className="modal-header">
          <div className="modal-title">Submit New Job</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Job Name</label>
          <input className="form-input" placeholder="e.g. Generate Q4 Sales Report" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as JobPriority }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Max Retries</label>
            <input className="form-input" type="number" min={0} max={10} value={form.max_retries}
              onChange={e => setForm(f => ({ ...f, max_retries: parseInt(e.target.value) }))} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Execution Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EXEC_TYPES.map(t => (
              <button key={t} className={`btn btn-sm ${form.execution_type === t ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleExecTypeChange(t)} style={{ fontSize: 11 }}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Payload (JSON)
            {payloadError && <span style={{ color: 'var(--red)', marginLeft: 8, fontWeight: 400, textTransform: 'none' }}>{payloadError}</span>}
          </label>
          <textarea className="form-textarea" value={payloadStr} onChange={e => handlePayloadChange(e.target.value)} rows={6} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button className={`btn btn-sm ${scheduleMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setScheduleMode(s => !s)}>
            <Clock size={12} /> Schedule for later
          </button>
        </div>

        {scheduleMode && (
          <div className="form-group">
            <label className="form-label">Run At</label>
            <input className="form-input" type="datetime-local" value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !form.name.trim() || !!payloadError}>
            {loading ? 'Submitting...' : 'Submit Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

function JobDetailModal({ job, onClose, onRefresh }: { job: Job; onClose: () => void; onRefresh: () => void }) {
  const [current, setCurrent] = useState(job)
  const [tab, setTab] = useState<'overview' | 'logs' | 'payload'>('overview')

  useEffect(() => {
    const interval = setInterval(async () => {
      if (['running', 'retrying', 'queued'].includes(current.status)) {
        const fresh = await api.jobs.get(job.id)
        setCurrent(fresh)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [job.id, current.status])

  const handleRetry = async () => {
    await api.jobs.retry(job.id)
    onRefresh()
    onClose()
  }

  const handleCancel = async () => {
    await api.jobs.cancel(job.id)
    onRefresh()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 580 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ marginBottom: 4 }}>{current.name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StatusBadge status={current.status} />
              <span className="td-mono">#{current.id}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="tabs">
          {(['overview', 'logs', 'payload'] as const).map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                ['Priority', <PriorityIcon key="p" priority={current.priority} />],
                ['Execution Type', current.execution_type.replace('_', ' ')],
                ['Worker', current.worker_id ?? '—'],
                ['Retries', `${current.retries} / ${current.max_retries}`],
                ['Exec Time', current.execution_time_ms ? `${(current.execution_time_ms / 1000).toFixed(2)}s` : '—'],
                ['Created', formatDistanceToNow(new Date(current.created_at), { addSuffix: true })],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
            {current.error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>ERROR</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#fca5a5', whiteSpace: 'pre-wrap' }}>{current.error}</div>
              </div>
            )}
            {current.result && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Result</div>
                <div className="log-output">{JSON.stringify(current.result, null, 2)}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'logs' && (
          <div className="log-output" style={{ minHeight: 220 }}>
            {current.logs || current.error || 'No logs available yet.'}
          </div>
        )}

        {tab === 'payload' && (
          <div className="log-output" style={{ minHeight: 220 }}>
            {JSON.stringify(current.payload, null, 2)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          {['failed', 'dead'].includes(current.status) && (
            <button className="btn btn-secondary btn-sm" onClick={handleRetry}>
              <RotateCcw size={12} /> Retry
            </button>
          )}
          {['queued', 'scheduled', 'pending'].includes(current.status) && (
            <button className="btn btn-danger btn-sm" onClick={handleCancel}>
              <Trash2 size={12} /> Cancel
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    try {
      const data = await api.jobs.list(statusFilter || undefined)
      setJobs(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [load, refreshKey])

  const filtered = jobs.filter(j =>
    !search || j.name.toLowerCase().includes(search.toLowerCase()) || j.id.toLowerCase().includes(search.toLowerCase())
  )

  const statusCounts = jobs.reduce((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Jobs</div>
          <div className="page-subtitle">{jobs.length} total · auto-refreshing every 3s</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Submit Job
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search by name or ID..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {STATUSES.map(s => (
            <button key={s || 'all'} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(s)} style={{ fontSize: 11 }}>
              {s || 'All'}
              {s && statusCounts[s] ? <span style={{ marginLeft: 4, opacity: 0.7 }}>{statusCounts[s]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 28px 24px' }}>
        {loading ? (
          <div className="empty-state"><div className="empty-desc">Loading jobs...</div></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">No jobs found</div>
            <div className="empty-desc">Submit a job to get started</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th><Hash size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Type</th>
                  <th><Cpu size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> Worker</th>
                  <th>Retries</th>
                  <th><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(job => (
                  <tr key={job.id} onClick={() => setSelectedJob(job)} style={{ cursor: 'pointer' }}>
                    <td className="td-mono">{job.id}</td>
                    <td style={{ fontWeight: 500, maxWidth: 200 }} className="truncate">{job.name}</td>
                    <td><StatusBadge status={job.status} /></td>
                    <td><PriorityIcon priority={job.priority} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{job.execution_type.replace('_', ' ')}</td>
                    <td className="td-mono">{job.worker_id ?? '—'}</td>
                    <td style={{ color: job.retries > 0 ? 'var(--yellow)' : 'var(--text-muted)' }}>{job.retries}/{job.max_retries}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </td>
                    <td><ChevronRight size={14} style={{ color: 'var(--text-muted)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && <CreateJobModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onRefresh={load} />}
    </div>
  )
}
