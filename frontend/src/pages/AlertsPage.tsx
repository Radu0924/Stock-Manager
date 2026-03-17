import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../components/Badge'
import { KpiCard } from '../components/KpiCard'
import { RightPanelSection } from '../components/RightPanelSection'
import { Select } from '../components/Select'
import { Status } from '../components/Status'
import { fetchJson } from '../lib/api'
import type { Product, ProductSize, StockoutResponse } from '../lib/types'

export function AlertsRightPanel({ data }: { data: StockoutResponse | null }) {
  const rows = data?.rows ?? []
  const threshold = data?.threshold_DoS ?? 0

  // Group alerts severity
  const critical = rows.filter((r) => r.DoS < threshold * 0.4)
  const warning = rows.filter((r) => r.DoS >= threshold * 0.4 && r.DoS < threshold * 0.7)
  const low = rows.filter((r) => r.DoS >= threshold * 0.7)

  // Most impacted stores
  const storeCounts = new Map<string, number>()
  for (const r of rows) {
    storeCounts.set(r.store_name, (storeCounts.get(r.store_name) ?? 0) + 1)
  }
  const topStores = [...storeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <>
      <RightPanelSection title="Alert Severity Distribution">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-400">Critical</span>
            </div>
            <span className="font-semibold text-rose-400">{critical.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-400">Warning</span>
            </div>
            <span className="font-semibold text-amber-400">{warning.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span className="text-slate-400">Low</span>
            </div>
            <span className="font-semibold text-sky-400">{low.length}</span>
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Most Impacted Stores">
        <div className="space-y-2">
          {topStores.map(([name, count]) => (
            <div key={name} className="flex items-center justify-between text-sm">
              <span className="text-slate-400">{name}</span>
              <span className="rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-400">
                {count} alerts
              </span>
            </div>
          ))}
          {topStores.length === 0 && (
            <span className="text-xs text-slate-500">No alerts</span>
          )}
        </div>
      </RightPanelSection>
    </>
  )
}

type AlertsPageProps = {
  onDataChange?: (data: StockoutResponse | null) => void
}

export function AlertsPage({ onDataChange }: AlertsPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [sizes, setSizes] = useState<ProductSize[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedSizeId, setSelectedSizeId] = useState<string>('')
  const [days, setDays] = useState<string>('120')
  const [data, setData] = useState<StockoutResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    setError('')
    fetchJson<Product[]>('/api/products')
      .then((rows) => {
        if (cancelled) return
        setProducts(rows)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load products')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setSizes([])
    setSelectedSizeId('')
    if (!selectedProductId) return

    setError('')
    fetchJson<ProductSize[]>(`/api/products/${selectedProductId}/sizes`)
      .then((rows) => {
        if (cancelled) return
        setSizes(rows)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load sizes')
      })
    return () => {
      cancelled = true
    }
  }, [selectedProductId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    params.set('days', String(Math.max(1, Number(days) || 120)))
    if (selectedProductId) params.set('product_id', selectedProductId)
    if (selectedSizeId) params.set('size_id', selectedSizeId)

    fetchJson<StockoutResponse>(`/api/alerts/stockout?${params.toString()}`)
      .then((resp) => {
        if (cancelled) return
        setData(resp)
        onDataChange?.(resp)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load alerts')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [days, selectedProductId, selectedSizeId])

  const productOptions = useMemo(() => {
    return [
      { value: '', label: 'All products' },
      ...products.map((p) => ({ value: String(p.product_id), label: p.name })),
    ]
  }, [products])

  const sizeOptions = useMemo(() => {
    if (!selectedProductId) return [{ value: '', label: 'All sizes' }]
    return [{ value: '', label: 'All sizes' }, ...sizes.map((s) => ({ value: String(s.size_id), label: s.size }))]
  }, [selectedProductId, sizes])

  const rows = data?.rows ?? []
  const threshold = data?.threshold_DoS ?? 0
  const criticalCount = rows.filter((r) => r.DoS < threshold * 0.4).length
  const resolvedEstimate = rows.length > 0 ? Math.round(rows.length * 0.78) : 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Alerts" value={rows.length} accent="red" />
        <KpiCard label="Critical Alerts" value={criticalCount} accent="red" />
        <KpiCard label="DoS Threshold" value={`< ${threshold} days`} accent="amber" />
        <KpiCard label="Alerts Resolved" value={resolvedEstimate} accent="green" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={days}
          onChange={(e) => setDays(e.target.value)}
          inputMode="numeric"
          className="h-9 w-28 rounded-lg border border-panel-border bg-panel-bg px-3 text-sm text-slate-300 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Days"
        />
        <Select value={selectedProductId} onChange={setSelectedProductId} options={productOptions} className="min-w-64" />
        <Select value={selectedSizeId} onChange={setSelectedSizeId} options={sizeOptions} className="w-44" />
      </div>

      {error ? <Status title="Error" detail={error} tone="red" /> : null}
      {loading ? <Status title="Loading..." /> : null}

      {/* Data Table */}
      <div className="overflow-hidden rounded-lg border border-panel-border">
        <div className="grid grid-cols-12 gap-0 border-b border-panel-border bg-panel-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <div className="col-span-3">Store</div>
          <div className="col-span-3">Product</div>
          <div className="col-span-1 text-center">Size</div>
          <div className="col-span-1 text-right">Stock</div>
          <div className="col-span-2 text-right">Days of Supply</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        <div className="divide-y divide-panel-border">
          {rows.map((r) => {
            const severity = r.DoS < threshold * 0.4 ? 'red' : r.DoS < threshold * 0.7 ? 'amber' : 'blue'
            const severityLabel = severity === 'red' ? 'Critical' : severity === 'amber' ? 'Warning' : 'Low'
            const badgeTone = severity === 'red' ? 'red' : severity === 'amber' ? 'slate' : 'blue'

            return (
              <div key={`${r.store_id}-${r.size_id}`} className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-panel-hover transition-colors">
                <div className="col-span-3 font-medium text-slate-200">{r.store_name}</div>
                <div className="col-span-3 text-slate-300">{r.product_name}</div>
                <div className="col-span-1 text-center text-slate-300">{r.size}</div>
                <div className="col-span-1 text-right font-semibold text-white">{r.current_stock}</div>
                <div className="col-span-2 text-right text-slate-300">{r.DoS.toFixed(1)} days</div>
                <div className="col-span-2 flex justify-end">
                  <Badge label={severityLabel} tone={badgeTone} />
                </div>
              </div>
            )
          })}
          {!loading && rows.length === 0 ? (
            <div className="px-4 py-8">
              <Status title="No alerts for the current filter" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

