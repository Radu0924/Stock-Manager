import { useEffect, useMemo, useState } from 'react'
import { KpiCard } from '../components/KpiCard'
import { RightPanelSection } from '../components/RightPanelSection'
import { Select } from '../components/Select'
import { Status } from '../components/Status'
import { fetchJson } from '../lib/api'
import type { DashboardStockResponse, Product, ProductSize } from '../lib/types'

function formatTimestamp(value?: string | null) {
  if (!value) return '—'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return value
  return dt.toLocaleString()
}

export function DashboardRightPanel({ rows }: { rows: DashboardStockResponse['rows'] }) {
  const totalStock = rows.reduce((sum, r) => sum + r.total_quantity, 0)
  const maxStore = rows.length > 0 ? rows.reduce((a, b) => (a.total_quantity > b.total_quantity ? a : b)) : null
  const minStore = rows.length > 0 ? rows.reduce((a, b) => (a.total_quantity < b.total_quantity ? a : b)) : null

  return (
    <>
      <RightPanelSection title="Stock Overview">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Total Units</span>
            <span className="font-semibold text-white">{totalStock.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Stores Active</span>
            <span className="font-semibold text-emerald-400">{rows.length}</span>
          </div>
          {maxStore && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Highest Stock</span>
              <span className="font-semibold text-sky-400">{maxStore.store_name}</span>
            </div>
          )}
          {minStore && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Lowest Stock</span>
              <span className="font-semibold text-amber-400">{minStore.store_name}</span>
            </div>
          )}
        </div>
      </RightPanelSection>

      <RightPanelSection title="Store Distribution">
        <div className="space-y-2">
          {rows.map((r) => {
            const pct = totalStock > 0 ? (r.total_quantity / totalStock) * 100 : 0
            return (
              <div key={r.store_id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{r.store_name}</span>
                  <span className="text-slate-300">{r.total_quantity}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-panel-border">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </RightPanelSection>
    </>
  )
}

type DashboardPageProps = {
  onDataChange?: (rows: DashboardStockResponse['rows']) => void
}

export function DashboardPage({ onDataChange }: DashboardPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [sizes, setSizes] = useState<ProductSize[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedSizeId, setSelectedSizeId] = useState<string>('')
  const [data, setData] = useState<DashboardStockResponse | null>(null)
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

    const qs = selectedSizeId ? `?size_id=${encodeURIComponent(selectedSizeId)}` : ''
    fetchJson<DashboardStockResponse>(`/api/dashboard/stock${qs}`)
      .then((resp) => {
        if (cancelled) return
        setData(resp)
        onDataChange?.(resp.rows)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load stock data')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedSizeId, onDataChange])

  const productOptions = useMemo(() => {
    return [
      { value: '', label: 'All products' },
      ...products.map((p) => ({ value: String(p.product_id), label: p.name })),
    ]
  }, [products])

  const sizeOptions = useMemo(() => {
    if (!selectedProductId) return [{ value: '', label: 'Total' }]
    return [{ value: '', label: 'Total' }, ...sizes.map((s) => ({ value: String(s.size_id), label: s.size }))]
  }, [selectedProductId, sizes])

  const rows = data?.rows ?? []
  const totalStock = rows.reduce((sum, r) => sum + r.total_quantity, 0)
  const avgStock = rows.length > 0 ? Math.round(totalStock / rows.length) : 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Inventory Units" value={totalStock.toLocaleString()} accent="green" />
        <KpiCard label="Active Stores" value={rows.length} accent="blue" />
        <KpiCard label="Avg. Stock / Store" value={avgStock.toLocaleString()} accent="amber" />
        <KpiCard label="Products Tracked" value={products.length} accent="default" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={selectedProductId} onChange={setSelectedProductId} options={productOptions} className="min-w-64" />
        <Select value={selectedSizeId} onChange={setSelectedSizeId} options={sizeOptions} className="w-36" />
      </div>

      {error ? <Status title="Error" detail={error} tone="red" /> : null}
      {loading ? <Status title="Loading..." /> : null}

      {/* Data Table */}
      <div className="overflow-hidden rounded-lg border border-panel-border">
        <div className="grid grid-cols-12 gap-0 border-b border-panel-border bg-panel-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <div className="col-span-5">Store</div>
          <div className="col-span-4 text-right">Quantity</div>
          <div className="col-span-3 text-right">Last Updated</div>
        </div>
        <div className="divide-y divide-panel-border">
          {rows.map((r) => (
            <div key={r.store_id} className="grid grid-cols-12 px-4 py-3 text-sm hover:bg-panel-hover transition-colors">
              <div className="col-span-5 font-medium text-slate-200">{r.store_name}</div>
              <div className="col-span-4 text-right font-semibold text-white">{r.total_quantity}</div>
              <div className="col-span-3 text-right text-slate-400">{formatTimestamp(r.last_updated)}</div>
            </div>
          ))}
          {!loading && rows.length === 0 ? (
            <div className="px-4 py-8">
              <Status title="No data to display" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

