import { useEffect, useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Clock, Calendar, X, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import type { Schedule } from '../types'
import { formatDistanceToNow, format } from 'date-fns'

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Every Monday 9 AM', value: '0 9 * * 1' },
  { label: 'First of month', value: '0 0 1 * *' },
]

const JOB_TEMPLATES = [
  { label: 'Daily Report', template: { name: 'Daily Sales Report', execution_type: 'report_gen', priority: 'normal', payload: { report_type: 'sales', format: 'pdf' }, max_retries: 2 } },
  { label: 'Data Sync', template: { name: 'ETL Sync', execution_type: 'etl_job', priority: 'high', payload: { source: 'postgres://prod', target: 'bigquery://dw' }, max_retries: 3 } },
  { label: 'Health Check', template: { name: 'System Health Check', execution_type: 'python_script', priority: 'low', payload: { script: 'health_check.py' }, max_retries: 1 } },
  { label: 'AI Batch', template: { name: 'AI Inference Batch', execution_type: 'ai_inference', priority: 'normal', payload: { model: 'gpt-4o', batch_size: 500 }, max_retries: 3 } },
]

function CreateScheduleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<'cron' | 'once'>('cron')
  const [name, setName] = useState('')
  const [cronExpr, setCronExpr] = useState('0 6 * * *')
  const [runOnceAt, setRunOnceAt] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await api.schedules.create({
        name,
        cron_expression: mode === 'cron' ? cronExpr : undefined,
        run_once_at: mode === 'once' ? runOnceAt : undefined,
        job_template: JOB_TEMPLATES[selectedTemplate].template,
        is_active: true,
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
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-header">
          <div className="modal-title">Create Schedule</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Schedule Name</label>
          <input className="form-input" placeholder="e.g. Nightly Data Sync" value={name}
            onChange={e => setName(e.target.value)} />
        </div>

        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${mode === 'cron' ? 'active' : ''}`} onClick={() => setMode('cron')}>
            Recurring (Cron)
          </button>
          <button className={`tab ${mode === 'once' ? 'active' : ''}`} onClick={() => setMode('once')}>
            Run Once
          </button>
        </div>

        {mode === 'cron' && (
          <div className="form-group">
            <label className="form-label">Cron Expression</label>
            <input className="form-input" style={{ fontFamily: 'var(--font-mono)' }}
              placeholder="0 6 * * *" value={cronExpr} onChange={e => setCronExpr(e.target.value)} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {CRON_PRESETS.map(p => (
                <button key={p.value} className={`btn btn-sm ${cronExpr === p.value ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setCronExpr(p.value)} style={{ fontSize: 11 }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'once' && (
          <div className="form-group">
            <label className="form-label">Run At</label>
            <input className="form-input" type="datetime-local" value={runOnceAt}
              onChange={e => setRunOnceAt(e.target.value)} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Job Template</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {JOB_TEMPLATES.map((t, i) => (
              <div key={i} onClick={() => setSelectedTemplate(i)}
                style={{
                  padding: '10px 14px', borderRadius: 8,
                  border: `1px solid ${selectedTemplate === i ? 'var(--accent)' : 'var(--border)'}`,
                  background: selectedTemplate === i ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                  cursor: 'pointer', transition: 'all 0.15s'
                }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {t.template.execution_type.replace('_', ' ')} · {t.template.priority} priority
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}
            disabled={loading || !name.trim() || (mode === 'once' && !runOnceAt)}>
            {loading ? 'Creating...' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScheduleCard({ schedule, onToggle, onDelete }: { schedule: Schedule; onToggle: () => void; onDelete: () => void }) {
  const isActive = schedule.is_active === 1

  return (
    <div className="card" style={{ opacity: isActive ? 1 : 0.6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{schedule.name}</div>
          <span className={`badge ${isActive ? 'badge-healthy' : 'badge-offline'}`}>
            {isActive ? 'Active' : 'Paused'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onToggle} title={isActive ? 'Pause' : 'Activate'}>
            {isActive ? <ToggleRight size={16} style={{ color: 'var(--green)' }} /> : <ToggleLeft size={16} />}
          </button>
          <button className="btn btn-danger btn-icon btn-sm" onClick={onDelete}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
        {schedule.cron_expression ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={12} style={{ color: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>
              {schedule.cron_expression}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={12} style={{ color: 'var(--purple)' }} />
            <span style={{ fontSize: 13, color: 'var(--purple)' }}>
              {schedule.run_once_at ? format(new Date(schedule.run_once_at), 'MMM d, yyyy HH:mm') : 'One-time'}
            </span>
          </div>
        )}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Job template</span>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>
            {String(schedule.job_template?.execution_type ?? 'custom').replace('_', ' ')}
          </span>
        </div>
        {schedule.last_run && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Last run</span>
            <span>{formatDistanceToNow(new Date(schedule.last_run), { addSuffix: true })}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Created</span>
          <span>{formatDistanceToNow(new Date(schedule.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  )
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    try {
      const data = await api.schedules.list()
      setSchedules(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (id: string) => {
    await api.schedules.toggle(id)
    load()
  }

  const handleDelete = async (id: string) => {
    await api.schedules.delete(id)
    load()
  }

  const active = schedules.filter(s => s.is_active).length
  const cron = schedules.filter(s => s.cron_expression).length
  const oneTime = schedules.filter(s => s.run_once_at).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Schedules</div>
          <div className="page-subtitle">{active} active · {cron} recurring · {oneTime} one-time</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Schedule
        </button>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: <RefreshCw size={14} />, label: 'Recurring', value: cron, color: 'var(--accent)' },
            { icon: <Calendar size={14} />, label: 'One-time', value: oneTime, color: 'var(--purple)' },
            { icon: <Clock size={14} />, label: 'Active', value: active, color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `color-mix(in srgb, ${s.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><div className="empty-desc">Loading schedules...</div></div>
        ) : schedules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🗓️</div>
            <div className="empty-title">No schedules yet</div>
            <div className="empty-desc">Create a recurring or one-time schedule to automate job execution</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Create Schedule
            </button>
          </div>
        ) : (
          <div className="grid-3">
            {schedules.map(s => (
              <ScheduleCard key={s.id} schedule={s}
                onToggle={() => handleToggle(s.id)}
                onDelete={() => handleDelete(s.id)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateScheduleModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}
