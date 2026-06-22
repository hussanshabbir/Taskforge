import { useEffect, useState } from 'react'
import { RefreshCw, Cpu, MemoryStick, CheckCircle, Activity, Wifi, WifiOff, Loader } from 'lucide-react'
import { api } from '../lib/api'
import type { Worker } from '../types'
import { formatDistanceToNow } from 'date-fns'

function ProgressBar({ value, color }: { value: number; color?: string }) {
  const c = color ?? (value > 80 ? 'var(--red)' : value > 60 ? 'var(--yellow)' : 'var(--green)')
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{value.toFixed(1)}%</span>
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${value}%`, background: c }} />
      </div>
    </div>
  )
}

function WorkerCard({ worker }: { worker: Worker }) {
  const isHealthy = worker.status === 'healthy' || worker.status === 'busy' || worker.status === 'idle'
  const isOffline = worker.status === 'offline'
  const isBusy = worker.status === 'busy'

  return (
    <div className="card" style={{ opacity: isOffline ? 0.6 : 1, transition: 'opacity 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: isOffline ? 'var(--bg-elevated)' : isBusy ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {isOffline ? <WifiOff size={14} style={{ color: 'var(--text-muted)' }} /> :
               isBusy ? <Loader size={14} style={{ color: 'var(--blue)', animation: 'spin 1s linear infinite' }} /> :
               <Wifi size={14} style={{ color: 'var(--green)' }} />}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{worker.worker_id}</div>
              <span className={`badge badge-${isOffline ? 'offline' : isHealthy ? 'healthy' : 'busy'}`} style={{ marginTop: 2 }}>
                {worker.status}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
            {worker.jobs_completed.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>jobs completed</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
              <Cpu size={12} /> CPU Usage
            </div>
          </div>
          <ProgressBar value={worker.cpu_usage} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
              <MemoryStick size={12} /> Memory Usage
            </div>
          </div>
          <ProgressBar value={worker.memory_usage} color="var(--purple)" />
        </div>
      </div>

      {worker.current_job && (
        <div style={{ marginTop: 14, padding: '8px 12px', background: 'rgba(59,130,246,0.08)', borderRadius: 6, border: '1px solid rgba(59,130,246,0.15)' }}>
          <div style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, marginBottom: 2 }}>CURRENT JOB</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' }}>{worker.current_job}</div>
        </div>
      )}

      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
          <Activity size={11} />
          Last heartbeat
        </div>
        <div style={{ fontSize: 11, color: isOffline ? 'var(--red)' : 'var(--green)', fontWeight: 500 }}>
          {formatDistanceToNow(new Date(worker.last_heartbeat), { addSuffix: true })}
        </div>
      </div>
    </div>
  )
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const data = await api.workers.list()
      setWorkers(data)
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

  const healthy = workers.filter(w => w.status !== 'offline').length
  const offline = workers.filter(w => w.status === 'offline').length
  const busy = workers.filter(w => w.status === 'busy').length
  const avgCpu = workers.length ? workers.reduce((s, w) => s + w.cpu_usage, 0) / workers.length : 0
  const totalCompleted = workers.reduce((s, w) => s + w.jobs_completed, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Workers</div>
          <div className="page-subtitle">{healthy} healthy · {busy} busy · {offline} offline</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="page-body">
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total Workers</div>
            <div className="stat-value">{workers.length}</div>
            <div className="stat-meta">{healthy} active</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Busy</div>
            <div className="stat-value" style={{ color: 'var(--blue)' }}>{busy}</div>
            <div className="stat-meta">processing jobs</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg CPU</div>
            <div className="stat-value" style={{ color: avgCpu > 80 ? 'var(--red)' : 'var(--text)' }}>
              {avgCpu.toFixed(1)}%
            </div>
            <div className="stat-meta">across fleet</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Jobs Run</div>
            <div className="stat-value">{totalCompleted.toLocaleString()}</div>
            <div className="stat-meta">this session</div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="empty-desc">Polling workers...</div></div>
        ) : workers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔌</div>
            <div className="empty-title">No workers registered</div>
            <div className="empty-desc">Workers register automatically when the backend starts</div>
          </div>
        ) : (
          <div className="grid-3">
            {workers.map(w => <WorkerCard key={w.worker_id} worker={w} />)}
          </div>
        )}

        {workers.length > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <div className="card-header"><span className="card-title">Worker Fleet Table</span></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Worker ID</th>
                    <th>Status</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th>Jobs Done</th>
                    <th>Current Job</th>
                    <th>Heartbeat</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map(w => (
                    <tr key={w.worker_id}>
                      <td style={{ fontWeight: 600 }}>{w.worker_id}</td>
                      <td><span className={`badge badge-${w.status === 'offline' ? 'offline' : w.status === 'busy' ? 'busy' : 'healthy'}`}>{w.status}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{w.cpu_usage.toFixed(1)}%</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{w.memory_usage.toFixed(1)}%</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{w.jobs_completed.toLocaleString()}</td>
                      <td className="td-mono">{w.current_job ?? '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {formatDistanceToNow(new Date(w.last_heartbeat), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
