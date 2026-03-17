import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '../components/Badge'
import { KpiCard } from '../components/KpiCard'
import { RightPanelSection } from '../components/RightPanelSection'
import { Select } from '../components/Select'
import { Status } from '../components/Status'
import { fetchJson } from '../lib/api'
import type { AlertHistoryRow, AlertHistoryResponse, AlertSeverity, Store } from '../lib/types'

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#f59e0b',
  Low: '#38bdf8',
}

const severityBadgeTone = (s: AlertSeverity): 'red' | 'blue' | 'slate' | 'green' => {
  if (s === 'Critical') return 'red'
  if (s === 'High') return 'red'
  if (s === 'Medium') return 'slate'
  return 'blue'
}

const resultBadgeTone = (r: AlertHistoryRow['result']): 'green' | 'red' | 'slate' => {
  if (r === 'Success') return 'green'
  if (r === 'Failure') return 'red'
  return 'slate'
}

// ── Right Panel ──

export function AlertsHistoryRightPanel({ rows }: { rows: AlertHistoryRow[] }) {
  const bySeverity = useMemo(() => {
    const map: Record<AlertSeverity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 }
    for (const r of rows) map[r.severity]++
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: SEVERITY_COLORS[name as AlertSeverity],
    }))
  }, [rows])

  const byStore = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.store_name, (map.get(r.store_name) ?? 0) + 1)
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, count]) => ({
        name: name.replace('Magazin ', '').slice(0, 12),
        alerts: count,
      }))
  }, [rows])

  return (
    <>
      <RightPanelSection title="Alert Severity Distribution - 7D">
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={bySeverity} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" stroke="none">
                {bySeverity.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {bySeverity.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-400">{d.name}</span>
                <span className="font-semibold text-slate-200">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Most Impacted Stores/DCs - 7D">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byStore} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#162231', border: '1px solid #1e3347', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="alerts" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </RightPanelSection>
    </>
  )
}

// ── Page ──

type AlertsHistoryPageProps = {
  onDataChange?: (rows: AlertHistoryRow[]) => void
}

export function AlertsHistoryPage({ onDataChange }: AlertsHistoryPageProps) {
  const [stores, setStores] = useState<Store[]>([])
  const [allRows, setAllRows] = useState<AlertHistoryRow[]>([])
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [storeFilter, setStoreFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Load stores
  useEffect(() => {
    let cancelled = false
    fetchJson<Store[]>('/api/stores')
      .then((s) => { if (!cancelled) setStores(s) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load stores') })
    return () => { cancelled = true }
  }, [])

  // Load real alerts history data from backend
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchJson<AlertHistoryResponse>('/api/alerts/history')
      .then((resp) => {
        if (!cancelled) {
          setAllRows(resp.rows)
          onDataChange?.(resp.rows)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load alerts history')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [onDataChange])

  // Filter options
  const severityOptions = useMemo(() => [
    { value: '', label: 'Severity [All]' },
    { value: 'Critical', label: 'Critical' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' },
  ], [])

  const storeOptions = useMemo(() => [
    { value: '', label: 'Store [All]' },
    ...stores.map((s) => ({ value: String(s.store_id), label: s.name })),
  ], [stores])

  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (severityFilter && r.severity !== severityFilter) return false
      if (storeFilter && String(r.store_id) !== storeFilter) return false
      return true
    })
  }, [allRows, severityFilter, storeFilter])

  // KPIs
  const totalAlerts = allRows.length
  const criticalCount = allRows.filter((r) => r.severity === 'Critical').length
  const warningCount = allRows.filter((r) => r.severity === 'Medium' || r.severity === 'High').length
  const resolvedCount = allRows.filter((r) => r.result === 'Success').length

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Alerts (7D)" value={totalAlerts} accent="red" />
        <KpiCard label="Critical Alerts" value={criticalCount} accent="red" />
        <KpiCard label="Warning Alerts" value={warningCount} accent="amber" />
        <KpiCard label="Alerts Resolved" value={resolvedCount} accent="green" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-panel-border bg-panel-bg px-3 py-1.5 text-sm text-slate-400">
          Date Range: Last 7 days
        </div>
        <Select value={severityFilter} onChange={setSeverityFilter} options={severityOptions} className="w-44" />
        <Select value={storeFilter} onChange={setStoreFilter} options={storeOptions} className="w-52" />
      </div>

      {error ? <Status title="Error" detail={error} tone="red" /> : null}
      {loading ? <Status title="Loading..." /> : null}

      {/* Alerts Table */}
      <div className="overflow-hidden rounded-lg border border-panel-border">
        <div className="grid grid-cols-12 gap-0 border-b border-panel-border bg-panel-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Alert Type</div>
          <div className="col-span-1 text-center">Severity</div>
          <div className="col-span-2">Trigger (Subject)</div>
          <div className="col-span-1">Location</div>
          <div className="col-span-1 text-center">Duration</div>
          <div className="col-span-1 text-center">Action</div>
          <div className="col-span-1 text-center">Result</div>
        </div>
        <div className="divide-y divide-panel-border">
          {filteredRows.map((r) => (
            <div key={r.alert_id} className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-panel-hover transition-colors">
              <div className="col-span-2 text-xs text-slate-400">{formatTimestamp(r.timestamp)}</div>
              <div className="col-span-2 text-slate-300">{r.alert_type}</div>
              <div className="col-span-1 flex justify-center">
                <Badge label={r.severity} tone={severityBadgeTone(r.severity)} />
              </div>
              <div className="col-span-2 text-slate-300 truncate">{r.trigger_subject}</div>
              <div className="col-span-1 text-slate-300 truncate">{r.store_name}</div>
              <div className="col-span-1 text-center text-xs text-slate-400">{r.duration ?? '—'}</div>
              <div className="col-span-1 text-center">
                <span className="text-xs text-sky-400 cursor-pointer hover:underline">{r.action_taken ?? '—'}</span>
              </div>
              <div className="col-span-1 flex justify-center">
                <Badge label={r.result ?? 'Pending'} tone={resultBadgeTone(r.result)} />
              </div>
            </div>
          ))}
          {!loading && filteredRows.length === 0 ? (
            <div className="px-4 py-8">
              <Status title="No alerts match the current filter" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Showing {filteredRows.length} of {allRows.length} alerts
      </div>
    </div>
  )
}
