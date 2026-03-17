import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { KpiCard } from '../components/KpiCard'
import { RightPanelSection } from '../components/RightPanelSection'
import { Status } from '../components/Status'
import { fetchJson } from '../lib/api'
import type { Store, WorkflowItem, WorkflowResponse } from '../lib/types'

function orderTone(type: WorkflowItem['orders'][number]['type']) {
  return type === 'automatic' ? 'green' : 'blue'
}

function orderLabel(type: WorkflowItem['orders'][number]['type']) {
  return type === 'automatic' ? 'Automatic' : 'Manager Approval'
}

export function WorkflowRightPanel({ data, storeNameById }: { data: WorkflowResponse | null; storeNameById: Map<number, string> }) {
  const items = data?.items ?? []
  const meta = data?.meta ?? {}

  const allOrders = items.flatMap((i) => i.orders)
  const autoOrders = allOrders.filter((o) => o.type === 'automatic')
  const manualOrders = allOrders.filter((o) => o.type === 'manager_approval')

  // Most active sources
  const sourceCounts = new Map<number, number>()
  for (const o of allOrders) {
    sourceCounts.set(o.source_id, (sourceCounts.get(o.source_id) ?? 0) + o.quantity)
  }
  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <>
      <RightPanelSection title="Transfer Summary">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Auto Threshold</span>
            <span className="font-semibold text-white">{String((meta as any).auto_threshold ?? '—')}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Min ROI</span>
            <span className="font-semibold text-white">{String((meta as any).min_roi ?? '—')}</span>
          </div>
          <div className="my-2 border-t border-panel-border" />
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-400">Automatic</span>
            </div>
            <span className="font-semibold text-emerald-400">{autoOrders.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span className="text-slate-400">Needs Approval</span>
            </div>
            <span className="font-semibold text-sky-400">{manualOrders.length}</span>
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Top Surplus Sources">
        <div className="space-y-2">
          {topSources.map(([storeId, qty]) => (
            <div key={storeId} className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{storeNameById.get(storeId) ?? `Store ${storeId}`}</span>
              <span className="text-xs font-semibold text-emerald-400">{qty} units</span>
            </div>
          ))}
          {topSources.length === 0 && (
            <span className="text-xs text-slate-500">No transfers</span>
          )}
        </div>
      </RightPanelSection>
    </>
  )
}

type WorkflowPageProps = {
  onDataChange?: (data: WorkflowResponse | null) => void
  onStoreMapChange?: (map: Map<number, string>) => void
}

export function WorkflowPage({ onDataChange, onStoreMapChange }: WorkflowPageProps) {
  const [stores, setStores] = useState<Store[]>([])
  const [days, setDays] = useState<string>('120')
  const [limit, setLimit] = useState<string>('10')
  const [data, setData] = useState<WorkflowResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    setError('')
    fetchJson<Store[]>('/api/stores')
      .then((rows) => {
        if (!cancelled) {
          setStores(rows)
          const map = new Map<number, string>()
          for (const s of rows) map.set(s.store_id, s.name)
          onStoreMapChange?.(map)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load stores')
      })
    return () => { cancelled = true }
  }, [onStoreMapChange])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    params.set('days', String(Math.max(1, Number(days) || 120)))
    params.set('limit', String(Math.max(1, Number(limit) || 10)))

    fetchJson<WorkflowResponse>(`/api/workflow/transfers/suggestions?${params.toString()}`)
      .then((resp) => {
        if (cancelled) return
        setData(resp)
        onDataChange?.(resp)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load suggestions')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [days, limit])

  const storeNameById = useMemo(() => {
    const map = new Map<number, string>()
    for (const s of stores) map.set(s.store_id, s.name)
    return map
  }, [stores])

  const items = data?.items ?? []
  const allOrders = items.flatMap((i) => i.orders)
  const autoCount = allOrders.filter((o) => o.type === 'automatic').length
  const manualCount = allOrders.filter((o) => o.type === 'manager_approval').length
  const totalUnits = allOrders.reduce((sum, o) => sum + o.quantity, 0)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Products with Transfers" value={items.length} accent="blue" />
        <KpiCard label="Total Orders" value={allOrders.length} accent="default" />
        <KpiCard label="Auto Transfers" value={autoCount} accent="green" />
        <KpiCard label="Pending Approval" value={manualCount} accent="amber" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          value={days}
          onChange={(e) => setDays(e.target.value)}
          inputMode="numeric"
          className="h-9 w-28 rounded-lg border border-panel-border bg-panel-bg px-3 text-sm text-slate-300 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Days"
        />
        <input
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          inputMode="numeric"
          className="h-9 w-28 rounded-lg border border-panel-border bg-panel-bg px-3 text-sm text-slate-300 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Limit"
        />
        <div className="ml-auto text-sm text-slate-400">
          Total units to transfer: <span className="font-semibold text-white">{totalUnits}</span>
        </div>
      </div>

      {error ? <Status title="Error" detail={error} tone="red" /> : null}
      {loading ? <Status title="Loading..." /> : null}

      {/* Transfer Groups */}
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.size_id} className="overflow-hidden rounded-lg border border-panel-border">
            <div className="flex items-center justify-between border-b border-panel-border bg-panel-surface px-4 py-3">
              <div>
                <span className="text-sm font-semibold text-white">{item.product_name}</span>
                <span className="ml-3 text-sm text-slate-400">
                  Size: <span className="text-slate-200">{item.size}</span>
                </span>
                {item.unit_price != null && (
                  <span className="ml-3 text-sm text-slate-400">
                    Price: <span className="text-slate-200">{item.unit_price.toFixed(2)} RON</span>
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">{item.orders.length} orders</span>
            </div>

            <div className="grid grid-cols-12 border-b border-panel-border bg-panel-bg/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <div className="col-span-4">Source</div>
              <div className="col-span-4">Destination</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Type</div>
            </div>
            <div className="divide-y divide-panel-border">
              {item.orders.map((o, idx) => {
                const sourceName = storeNameById.get(o.source_id) ?? `Store ${o.source_id}`
                const destName = storeNameById.get(o.destination_id) ?? `Store ${o.destination_id}`
                return (
                  <div key={`${item.size_id}-${idx}`} className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-panel-hover transition-colors">
                    <div className="col-span-4 font-medium text-slate-200">{sourceName}</div>
                    <div className="col-span-4 font-medium text-slate-200">{destName}</div>
                    <div className="col-span-2 text-right font-semibold text-white">{o.quantity}</div>
                    <div className="col-span-2 flex justify-end">
                      <Badge label={orderLabel(o.type)} tone={orderTone(o.type)} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {!loading && items.length === 0 ? <Status title="No transfer suggestions for the current filter" /> : null}
      </div>
    </div>
  )
}

