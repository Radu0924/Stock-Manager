import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { KpiCard } from '../components/KpiCard'
import { RightPanelSection } from '../components/RightPanelSection'
import { fetchJson } from '../lib/api'
import type { Store, WorkflowResponse } from '../lib/types'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Truck, Clock, AlertTriangle, ArrowRight, MapPin, TrendingUp } from 'lucide-react'

// ── Types ──

type ShipmentStatus = 'in-transit' | 'delivered' | 'pending' | 'delayed'

interface Shipment {
  id: string
  product: string
  size: string
  quantity: number
  source: string
  destination: string
  status: ShipmentStatus
  eta: string
  dispatchedAt: string
  cost: number
  priority: 'high' | 'medium' | 'low'
}

export interface LogisticsStats {
  totalShipments: number
  inTransit: number
  delivered: number
  delayed: number
  avgDeliveryTime: number
  totalCost: number
  shipments: Shipment[]
}

// ── Helpers ──

const STATUS_COLORS: Record<ShipmentStatus, { bg: string; text: string; dot: string }> = {
  'in-transit': { bg: 'bg-sky-500/10', text: 'text-sky-400', dot: 'bg-sky-500' },
  delivered: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
  delayed: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'red',
  medium: 'slate',
  low: 'green',
}

const PIE_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f87171']

const CHART_TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#162231', border: '1px solid #1e3347', borderRadius: 8, fontSize: 12 },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#e2e8f0' },
}

function statusLabel(s: ShipmentStatus) {
  return s === 'in-transit' ? 'In Transit' : s.charAt(0).toUpperCase() + s.slice(1)
}

function buildShipmentsFromWorkflow(
  workflowData: WorkflowResponse,
  stores: Store[],
): Shipment[] {
  const storeMap = new Map(stores.map((s) => [s.store_id, s.name]))
  const shipments: Shipment[] = []
  const statuses: ShipmentStatus[] = ['in-transit', 'delivered', 'pending', 'delayed']
  const priorities: Shipment['priority'][] = ['high', 'medium', 'low']
  let idx = 0

  for (const item of workflowData.items) {
    for (const order of item.orders) {
      idx++
      const statusIdx = idx % 4
      const priorityIdx = order.type === 'automatic' ? 2 : order.quantity > 30 ? 0 : 1
      const hoursAgo = Math.floor(4 + (idx * 7) % 48)
      const etaHours = statusIdx === 1 ? 0 : Math.floor(2 + (idx * 3) % 24)
      const now = new Date()
      const dispatched = new Date(now.getTime() - hoursAgo * 3600000)
      const eta = new Date(now.getTime() + etaHours * 3600000)

      shipments.push({
        id: `SHP-${String(1000 + idx).slice(1)}`,
        product: item.product_name,
        size: item.size,
        quantity: order.quantity,
        source: storeMap.get(order.source_id) ?? `Store #${order.source_id}`,
        destination: storeMap.get(order.destination_id) ?? `Store #${order.destination_id}`,
        status: statuses[statusIdx],
        eta: eta.toISOString(),
        dispatchedAt: dispatched.toISOString(),
        cost: Math.round(15 + order.quantity * 1.2 + (order.destination_id * 3.5)),
        priority: priorities[priorityIdx],
      })
    }
  }

  return shipments
}

function generateFallbackShipments(stores: Store[]): Shipment[] {
  if (stores.length < 2) return []
  const pairs: [string, string][] = []
  for (let i = 0; i < Math.min(stores.length, 6); i++) {
    for (let j = i + 1; j < Math.min(stores.length, 6); j++) {
      pairs.push([stores[i].name, stores[j].name])
    }
  }
  const products = ['Running Shoes', 'Winter Jacket', 'Casual T-Shirt', 'Sports Bag', 'Denim Jeans', 'Cotton Hoodie']
  const sizes = ['S', 'M', 'L', 'XL', '42', '44']
  const statuses: ShipmentStatus[] = ['in-transit', 'delivered', 'pending', 'delayed']
  const priorities: Shipment['priority'][] = ['high', 'medium', 'low']

  return pairs.slice(0, 15).map((p, i) => {
    const now = new Date()
    const hoursAgo = 4 + (i * 5) % 40
    const etaHours = i % 4 === 1 ? 0 : 3 + (i * 2) % 20
    return {
      id: `SHP-${String(1000 + i + 1).slice(1)}`,
      product: products[i % products.length],
      size: sizes[i % sizes.length],
      quantity: 10 + (i * 7) % 60,
      source: p[0],
      destination: p[1],
      status: statuses[i % 4],
      eta: new Date(now.getTime() + etaHours * 3600000).toISOString(),
      dispatchedAt: new Date(now.getTime() - hoursAgo * 3600000).toISOString(),
      cost: Math.round(20 + (10 + (i * 7) % 60) * 1.1 + i * 4),
      priority: priorities[i % 3],
    }
  })
}

// ── Delivery performance mock (last 7 days) ──
function buildDeliveryTrend(shipments: Shipment[]) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((d, i) => {
    const base = Math.floor(shipments.length / 7)
    return {
      day: d,
      delivered: Math.max(1, base + ((i * 3) % 5) - 2),
      delayed: Math.max(0, Math.floor(base * 0.15) + (i % 3 === 0 ? 1 : 0)),
      inTransit: Math.max(1, base + ((i * 2) % 4)),
    }
  })
}

// ── Main Page ──

export function LogisticsPage({ onDataChange }: { onDataChange?: (stats: LogisticsStats) => void }) {
  const [stores, setStores] = useState<Store[]>([])
  const [workflowData, setWorkflowData] = useState<WorkflowResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'eta' | 'cost' | 'quantity'>('eta')

  useEffect(() => {
    Promise.all([
      fetchJson<Store[]>('/api/stores'),
      fetchJson<WorkflowResponse>('/api/workflow/transfers/suggestions'),
    ])
      .then(([s, w]) => {
        setStores(s)
        setWorkflowData(w)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const shipments = useMemo(() => {
    if (workflowData && workflowData.items.length > 0) {
      return buildShipmentsFromWorkflow(workflowData, stores)
    }
    return generateFallbackShipments(stores)
  }, [workflowData, stores])

  const stats = useMemo<LogisticsStats>(() => {
    const inTransit = shipments.filter((s) => s.status === 'in-transit').length
    const delivered = shipments.filter((s) => s.status === 'delivered').length
    const delayed = shipments.filter((s) => s.status === 'delayed').length
    const totalCost = shipments.reduce((a, s) => a + s.cost, 0)
    const avgDeliveryTime = shipments.length > 0 ? Math.round(shipments.reduce((a, s) => {
      const d = new Date(s.eta).getTime() - new Date(s.dispatchedAt).getTime()
      return a + d / 3600000
    }, 0) / shipments.length) : 0
    return { totalShipments: shipments.length, inTransit, delivered, delayed, avgDeliveryTime, totalCost, shipments }
  }, [shipments])

  useEffect(() => {
    onDataChange?.(stats)
  }, [stats, onDataChange])

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? shipments : shipments.filter((s) => s.status === statusFilter)
    list = [...list].sort((a, b) => {
      if (sortBy === 'eta') return new Date(a.eta).getTime() - new Date(b.eta).getTime()
      if (sortBy === 'cost') return b.cost - a.cost
      return b.quantity - a.quantity
    })
    return list
  }, [shipments, statusFilter, sortBy])

  const deliveryTrend = useMemo(() => buildDeliveryTrend(shipments), [shipments])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Shipments" value={stats.totalShipments} accent="blue" />
        <KpiCard label="In Transit" value={stats.inTransit} accent="amber" />
        <KpiCard label="Delivered" value={stats.delivered} accent="green" />
        <KpiCard label="Delayed" value={stats.delayed} accent="red" />
      </div>

      {/* Delivery Trend Chart */}
      <div className="rounded-xl border border-panel-border bg-panel-surface p-4">
        <h3 className="mb-4 text-sm font-semibold text-white">Delivery Performance — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={deliveryTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3347" />
            <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#34d399" fill="#34d399" fillOpacity={0.15} strokeWidth={2} />
            <Area type="monotone" dataKey="inTransit" name="In Transit" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.10} strokeWidth={2} />
            <Area type="monotone" dataKey="delayed" name="Delayed" stroke="#f87171" fill="#f87171" fillOpacity={0.10} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          {(['all', 'in-transit', 'pending', 'delivered', 'delayed'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-panel-surface text-slate-400 hover:bg-panel-hover hover:text-slate-200'
              }`}
            >
              {s === 'all' ? 'All' : statusLabel(s as ShipmentStatus)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort by:</span>
          {(['eta', 'cost', 'quantity'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                sortBy === key
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'bg-panel-surface text-slate-400 hover:bg-panel-hover hover:text-slate-200'
              }`}
            >
              {key === 'eta' ? 'ETA' : key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Shipment Table */}
      <div className="rounded-xl border border-panel-border bg-panel-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-panel-border text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">ETA</th>
                <th className="px-4 py-3 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border">
              {filtered.map((s) => {
                const sc = STATUS_COLORS[s.status]
                const eta = new Date(s.eta)
                const now = new Date()
                const hoursLeft = Math.max(0, Math.round((eta.getTime() - now.getTime()) / 3600000))
                return (
                  <tr key={s.id} className="transition-colors hover:bg-panel-hover">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{s.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200">{s.product}</div>
                      <div className="text-xs text-slate-500">Size {s.size}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        <span className="max-w-[90px] truncate">{s.source}</span>
                        <ArrowRight className="h-3 w-3 text-slate-500" />
                        <MapPin className="h-3 w-3 text-sky-400" />
                        <span className="max-w-[90px] truncate">{s.destination}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{s.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${sc.bg} ${sc.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={PRIORITY_COLORS[s.priority] as 'red' | 'slate' | 'green'} label={s.priority.charAt(0).toUpperCase() + s.priority.slice(1)} />
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'delivered' ? (
                        <span className="text-xs text-emerald-400">Delivered</span>
                      ) : (
                        <div>
                          <span className="text-xs text-slate-300">{hoursLeft}h left</span>
                          <div className="text-[10px] text-slate-500">
                            {eta.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-white">
                      ${s.cost.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">No shipments match the current filter.</div>
        )}
      </div>
    </div>
  )
}

// ── Right Panel ──

export function LogisticsRightPanel({ stats }: { stats: LogisticsStats | null }) {
  if (!stats || stats.totalShipments === 0) {
    return (
      <RightPanelSection title="Logistics">
        <p className="text-sm text-slate-500">No shipment data available.</p>
      </RightPanelSection>
    )
  }

  const statusBreakdown = [
    { name: 'In Transit', value: stats.inTransit },
    { name: 'Delivered', value: stats.delivered },
    { name: 'Pending', value: stats.shipments.filter((s) => s.status === 'pending').length },
    { name: 'Delayed', value: stats.delayed },
  ]

  const priorityBreakdown = [
    { name: 'High', value: stats.shipments.filter((s) => s.priority === 'high').length, fill: '#f87171' },
    { name: 'Medium', value: stats.shipments.filter((s) => s.priority === 'medium').length, fill: '#fbbf24' },
    { name: 'Low', value: stats.shipments.filter((s) => s.priority === 'low').length, fill: '#34d399' },
  ]

  // Top routes by shipment count
  const routeCounts = new Map<string, number>()
  for (const s of stats.shipments) {
    const key = `${s.source} → ${s.destination}`
    routeCounts.set(key, (routeCounts.get(key) ?? 0) + 1)
  }
  const topRoutes = [...routeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  const onTimeRate = stats.totalShipments > 0
    ? Math.round(((stats.delivered + stats.inTransit) / stats.totalShipments) * 100)
    : 0

  return (
    <>
      <RightPanelSection title="Shipment Status">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={statusBreakdown}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {statusBreakdown.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip {...CHART_TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {statusBreakdown.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
              <span className="text-slate-400">{s.name}</span>
              <span className="ml-auto font-semibold text-white">{s.value}</span>
            </div>
          ))}
        </div>
      </RightPanelSection>

      <RightPanelSection title="Priority Breakdown">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={priorityBreakdown} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
              {priorityBreakdown.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </RightPanelSection>

      <RightPanelSection title="Key Metrics">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Avg Delivery Time</span>
            </div>
            <span className="font-semibold text-white">{stats.avgDeliveryTime}h</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>On-Time Rate</span>
            </div>
            <span className="font-semibold text-emerald-400">{onTimeRate}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Truck className="h-3.5 w-3.5" />
              <span>Total Cost</span>
            </div>
            <span className="font-semibold text-white">${stats.totalCost.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Delayed</span>
            </div>
            <span className="font-semibold text-red-400">{stats.delayed}</span>
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Top Routes">
        <div className="space-y-2">
          {topRoutes.map(([route, count]) => (
            <div key={route} className="flex items-center justify-between text-xs">
              <span className="max-w-[160px] truncate text-slate-300">{route}</span>
              <Badge tone="blue" label={String(count)} />
            </div>
          ))}
        </div>
      </RightPanelSection>
    </>
  )
}
