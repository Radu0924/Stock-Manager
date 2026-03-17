import { useEffect, useMemo, useState } from 'react'
import { Search, Shield, AlertTriangle, Info, CheckCircle, XCircle, Clock } from 'lucide-react'
import { KpiCard } from '../components/KpiCard'
import { RightPanelSection } from '../components/RightPanelSection'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

// ── Types ──

export type AuditAction = 'login' | 'config_change' | 'transfer_approve' | 'transfer_reject' | 'alert_acknowledge' | 'user_create' | 'export_data'

export type AuditLogRow = {
  id: number
  timestamp: string
  user: string
  action: AuditAction
  subject: string
  details: string
  result: 'Success' | 'Failure' | 'Pending'
}

// ── Mock data generator ──

const ACTIONS: AuditAction[] = ['login', 'config_change', 'transfer_approve', 'transfer_reject', 'alert_acknowledge', 'user_create', 'export_data']
const USERS = ['admin', 'manager_01', 'analyst_02', 'viewer_03', 'system']
const SUBJECTS_MAP: Record<AuditAction, string[]> = {
  login: ['Web UI', 'API Key', 'SSO'],
  config_change: ['DoS Target → 18', 'Safety Factor → 0.25', 'Stockout Threshold → 3', 'w1 → 0.45'],
  transfer_approve: ['Transfer #1042 (Bucharest→Cluj)', 'Transfer #1038 (Iasi→Timisoara)', 'Transfer #1055 (Brasov→Craiova)'],
  transfer_reject: ['Transfer #1041 — insufficient surplus', 'Transfer #1039 — low ROI'],
  alert_acknowledge: ['Stockout Alert — Store #3', 'Critical Alert — Store #7', 'Warning — Store #1'],
  user_create: ['New user: logistics_lead', 'New user: regional_mgr'],
  export_data: ['Dashboard CSV', 'Inventory Report', 'Alerts Excel'],
}

function generateMockLogs(count: number): AuditLogRow[] {
  const rows: AuditLogRow[] = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]
    const subjects = SUBJECTS_MAP[action]
    rows.push({
      id: count - i,
      timestamp: new Date(now - i * 7200000 - Math.random() * 3600000).toISOString(),
      user: USERS[Math.floor(Math.random() * USERS.length)],
      action,
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      details: `Automated mock entry #${count - i}`,
      result: Math.random() > 0.1 ? 'Success' : Math.random() > 0.5 ? 'Failure' : 'Pending',
    })
  }
  return rows
}

// ── Helpers ──

const ACTION_LABELS: Record<AuditAction, string> = {
  login: 'Login',
  config_change: 'Config Change',
  transfer_approve: 'Transfer Approved',
  transfer_reject: 'Transfer Rejected',
  alert_acknowledge: 'Alert Acknowledged',
  user_create: 'User Created',
  export_data: 'Data Export',
}

const ACTION_COLORS: Record<AuditAction, string> = {
  login: 'bg-blue-500/20 text-blue-400',
  config_change: 'bg-amber-500/20 text-amber-400',
  transfer_approve: 'bg-emerald-500/20 text-emerald-400',
  transfer_reject: 'bg-red-500/20 text-red-400',
  alert_acknowledge: 'bg-purple-500/20 text-purple-400',
  user_create: 'bg-cyan-500/20 text-cyan-400',
  export_data: 'bg-slate-500/20 text-slate-400',
}

const RESULT_ICON: Record<string, typeof CheckCircle> = {
  Success: CheckCircle,
  Failure: XCircle,
  Pending: Clock,
}

const RESULT_COLOR: Record<string, string> = {
  Success: 'text-emerald-400',
  Failure: 'text-red-400',
  Pending: 'text-amber-400',
}

// ── Components ──

export function AuditLogsPage({ onDataChange }: { onDataChange?: (rows: AuditLogRow[]) => void }) {
  const [rows] = useState<AuditLogRow[]>(() => generateMockLogs(80))
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all')

  useEffect(() => {
    onDataChange?.(rows)
  }, [rows, onDataChange])

  const filtered = useMemo(() => {
    let result = rows
    if (actionFilter !== 'all') result = result.filter((r) => r.action === actionFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.user.toLowerCase().includes(q) ||
          r.subject.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q)
      )
    }
    return result
  }, [rows, actionFilter, search])

  const stats = useMemo(() => {
    const success = rows.filter((r) => r.result === 'Success').length
    const failure = rows.filter((r) => r.result === 'Failure').length
    const uniqueUsers = new Set(rows.map((r) => r.user)).size
    return { total: rows.length, success, failure, uniqueUsers }
  }, [rows])

  return (
    <div className="space-y-6">
      {/* Mock data warning */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        Showing mock audit data. Real logging will be available when the backend delivers <code className="mx-1 text-amber-200">GET /api/audit/logs</code>.
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Events" value={String(stats.total)} accent="blue" />
        <KpiCard label="Successful" value={String(stats.success)} accent="green" />
        <KpiCard label="Failures" value={String(stats.failure)} accent="red" />
        <KpiCard label="Unique Users" value={String(stats.uniqueUsers)} accent="amber" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, subject, details..."
            className="h-9 w-full rounded-lg border border-panel-border bg-panel-bg pl-9 pr-3 text-sm text-slate-300 placeholder-slate-500 focus:border-slate-500 focus:outline-none"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as AuditAction | 'all')}
          className="h-9 rounded-lg border border-panel-border bg-panel-bg px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
        >
          <option value="all">All Actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-panel-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-panel-border bg-panel-surface text-xs uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {filtered.slice(0, 50).map((row) => {
              const ResultIcon = RESULT_ICON[row.result] ?? Info
              return (
                <tr key={row.id} className="bg-panel-bg transition-colors hover:bg-panel-hover">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-400">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-200">{row.user}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[row.action]}`}>
                      {ACTION_LABELS[row.action]}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-slate-300">{row.subject}</td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1 text-xs font-medium ${RESULT_COLOR[row.result]}`}>
                      <ResultIcon className="h-3.5 w-3.5" />
                      {row.result}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 50 && (
        <p className="text-xs text-slate-500">Showing first 50 of {filtered.length} entries.</p>
      )}
    </div>
  )
}

// ── Right Panel ──

const DONUT_COLORS = ['#38bdf8', '#f59e0b', '#22c55e', '#ef4444', '#a78bfa', '#06b6d4', '#64748b']

export function AuditLogsRightPanel({ rows }: { rows: AuditLogRow[] }) {
  // Action distribution
  const actionDist = useMemo(() => {
    const map = new Map<AuditAction, number>()
    for (const r of rows) map.set(r.action, (map.get(r.action) ?? 0) + 1)
    return Array.from(map, ([action, count]) => ({ name: ACTION_LABELS[action], value: count }))
  }, [rows])

  // User activity
  const userActivity = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.user, (map.get(r.user) ?? 0) + 1)
    return Array.from(map, ([user, count]) => ({ user, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [rows])

  // Security insights
  const failureCount = rows.filter((r) => r.result === 'Failure').length
  const loginFailures = rows.filter((r) => r.action === 'login' && r.result === 'Failure').length

  if (!rows.length) return <p className="text-xs text-slate-500">No audit data.</p>

  return (
    <div className="space-y-5">
      <RightPanelSection title="Action Distribution">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie data={actionDist} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} stroke="none">
              {actionDist.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#162231', border: '1px solid #1e3347', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-2">
          {actionDist.map((d, i) => (
            <span key={d.name} className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              {d.name}
            </span>
          ))}
        </div>
      </RightPanelSection>

      <RightPanelSection title="Top Users">
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={userActivity} layout="vertical" margin={{ left: 0, right: 10, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="user" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={80} />
            <Bar dataKey="count" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={14} />
            <Tooltip
              contentStyle={{ background: '#162231', border: '1px solid #1e3347', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </RightPanelSection>

      <RightPanelSection title="Security Insights">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-panel-bg p-2.5">
            <Shield className={`h-4 w-4 ${failureCount > 5 ? 'text-red-400' : 'text-emerald-400'}`} />
            <div>
              <p className="font-medium text-slate-200">{failureCount} Failed Operations</p>
              <p className="text-slate-500">{loginFailures} login failures detected</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-panel-bg p-2.5">
            <Info className="h-4 w-4 text-blue-400" />
            <div>
              <p className="font-medium text-slate-200">Config changes</p>
              <p className="text-slate-500">{rows.filter((r) => r.action === 'config_change').length} settings modified</p>
            </div>
          </div>
        </div>
      </RightPanelSection>
    </div>
  )
}
