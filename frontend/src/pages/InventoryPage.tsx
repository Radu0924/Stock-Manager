import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Badge } from '../components/Badge'
import { KpiCard } from '../components/KpiCard'
import { RightPanelSection } from '../components/RightPanelSection'
import { Select } from '../components/Select'
import { Status } from '../components/Status'
import { fetchJson } from '../lib/api'
import type { DashboardStockRow, InventorySkuRow, Product, ProductSize, StockoutResponse, DashboardStockResponse } from '../lib/types'

// ── Right Panel ──

const DONUT_COLORS = { optimal: '#22c55e', lowRisk: '#f59e0b', outOfStock: '#ef4444' }

export function InventoryRightPanel({ skuRows, storeRows }: { skuRows: InventorySkuRow[]; storeRows: DashboardStockRow[] }) {
  const optimal = skuRows.filter((r) => !r.is_stockout && r.DoS >= 10).length
  const lowRisk = skuRows.filter((r) => !r.is_stockout && r.DoS < 10 && r.DoS >= 5).length
  const outOfStock = skuRows.filter((r) => r.is_stockout || r.DoS < 5).length

  const donutData = [
    { name: 'Optimal', value: optimal, color: DONUT_COLORS.optimal },
    { name: 'Low Stock Risk', value: lowRisk, color: DONUT_COLORS.lowRisk },
    { name: 'Out of Stock', value: outOfStock, color: DONUT_COLORS.outOfStock },
  ]

  const barData = storeRows.map((r) => ({
    name: r.store_name.replace('Magazin ', '').slice(0, 12),
    stock: r.total_quantity,
  }))

  return (
    <>
      <RightPanelSection title="Global Stock Status">
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                dataKey="value"
                stroke="none"
              >
                {donutData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {donutData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-400">{d.name}</span>
                <span className="font-semibold text-slate-200">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Stock Distribution by Store">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#162231', border: '1px solid #1e3347', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="stock" fill="#22c55e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </RightPanelSection>
    </>
  )
}

// ── Page ──

type InventoryPageProps = {
  onSkuDataChange?: (rows: InventorySkuRow[]) => void
  onStoreDataChange?: (rows: DashboardStockRow[]) => void
}

export function InventoryPage({ onSkuDataChange, onStoreDataChange }: InventoryPageProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [sizes, setSizes] = useState<ProductSize[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedSizeId, setSelectedSizeId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [stockoutData, setStockoutData] = useState<StockoutResponse | null>(null)
  const [storeData, setStoreData] = useState<DashboardStockRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Load products
  useEffect(() => {
    let cancelled = false
    fetchJson<Product[]>('/api/products')
      .then((rows) => { if (!cancelled) { setProducts(rows); setError('') } })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Load store stock totals
  useEffect(() => {
    let cancelled = false
    fetchJson<DashboardStockResponse>('/api/dashboard/stock')
      .then((resp) => {
        if (!cancelled) {
          setStoreData(resp.rows)
          onStoreDataChange?.(resp.rows)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [onStoreDataChange])

  // Load sizes when product selected
  useEffect(() => {
    let cancelled = false
    setSizes([])
    setSelectedSizeId('')
    if (!selectedProductId) return
    fetchJson<ProductSize[]>(`/api/products/${selectedProductId}/sizes`)
      .then((rows) => { if (!cancelled) setSizes(rows) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [selectedProductId])

  // Load SKU-level inventory data (using stockout endpoint which returns all SKU metrics)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    params.set('days', '120')
    if (selectedProductId) params.set('product_id', selectedProductId)
    if (selectedSizeId) params.set('size_id', selectedSizeId)

    fetchJson<StockoutResponse>(`/api/alerts/stockout?${params.toString()}`)
      .then((resp) => {
        if (!cancelled) {
          setStockoutData(resp)
          // Convert stockout rows to inventory SKU rows
          const skuRows: InventorySkuRow[] = resp.rows.map((r) => {
            const product = products.find((p) => p.product_id === r.product_id)
            return {
              ...r,
              unit_price: product?.unit_price ?? null,
              category: product?.category ?? null,
            }
          })
          onSkuDataChange?.(skuRows)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load inventory')
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedProductId, selectedSizeId, products, onSkuDataChange])

  const productOptions = useMemo(() => [
    { value: '', label: 'All products' },
    ...products.map((p) => ({ value: String(p.product_id), label: p.name })),
  ], [products])

  const sizeOptions = useMemo(() => {
    if (!selectedProductId) return [{ value: '', label: 'All sizes' }]
    return [{ value: '', label: 'All sizes' }, ...sizes.map((s) => ({ value: String(s.size_id), label: s.size }))]
  }, [selectedProductId, sizes])

  const rows = stockoutData?.rows ?? []

  // Enrich with product data
  const enrichedRows = useMemo(() => {
    return rows.map((r) => {
      const product = products.find((p) => p.product_id === r.product_id)
      return { ...r, unit_price: product?.unit_price ?? null, category: product?.category ?? null }
    })
  }, [rows, products])

  // Filter by search
  const filteredRows = useMemo(() => {
    if (!searchQuery) return enrichedRows
    const q = searchQuery.toLowerCase()
    return enrichedRows.filter(
      (r) =>
        r.product_name.toLowerCase().includes(q) ||
        r.store_name.toLowerCase().includes(q) ||
        r.size.toLowerCase().includes(q)
    )
  }, [enrichedRows, searchQuery])

  // KPI computations
  const totalUnits = storeData.reduce((sum, r) => sum + r.total_quantity, 0)
  const skuCount = enrichedRows.length
  const outOfStockRisk = skuCount > 0 ? ((enrichedRows.filter((r) => r.is_stockout).length / skuCount) * 100).toFixed(1) : '0'

  const alertTone = (r: typeof enrichedRows[0]) => {
    if (r.is_stockout || r.DoS < 5) return 'red' as const
    if (r.DoS < 10) return 'slate' as const
    return 'green' as const
  }
  const alertLabel = (r: typeof enrichedRows[0]) => {
    if (r.is_stockout || r.DoS < 5) return 'Stockout Risk'
    if (r.DoS < 10) return 'Low Stock'
    return 'None'
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Total Inventory Units" value={totalUnits.toLocaleString()} accent="green" />
        <KpiCard label="SKU Entries" value={skuCount.toLocaleString()} accent="blue" />
        <KpiCard label="Active Products" value={products.length.toLocaleString()} accent="default" />
        <KpiCard label="Out of Stock Risk" value={`${outOfStockRisk}%`} accent={Number(outOfStockRisk) > 5 ? 'red' : 'green'} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedProductId} onChange={setSelectedProductId} options={productOptions} className="min-w-64" />
        <Select value={selectedSizeId} onChange={setSelectedSizeId} options={sizeOptions} className="w-36" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-56 rounded-lg border border-panel-border bg-panel-bg px-3 text-sm text-slate-300 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Search SKUs..."
        />
      </div>

      {error ? <Status title="Error" detail={error} tone="red" /> : null}
      {loading ? <Status title="Loading..." /> : null}

      {/* SKU Performance Table */}
      <div className="overflow-hidden rounded-lg border border-panel-border">
        <div className="grid grid-cols-12 gap-0 border-b border-panel-border bg-panel-surface px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <div className="col-span-3">Product Name</div>
          <div className="col-span-1 text-center">Size</div>
          <div className="col-span-2 text-right">Quantity On-Hand</div>
          <div className="col-span-2 text-right">Days of Supply</div>
          <div className="col-span-1 text-center">Alerts</div>
          <div className="col-span-2">Location</div>
          <div className="col-span-1 text-center">Speed</div>
        </div>
        <div className="divide-y divide-panel-border">
          {filteredRows.map((r) => (
            <div key={`${r.store_id}-${r.size_id}`} className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-panel-hover transition-colors">
              <div className="col-span-3 font-medium text-slate-200">{r.product_name}</div>
              <div className="col-span-1 text-center text-slate-300">{r.size}</div>
              <div className="col-span-2 text-right font-semibold text-white">{r.current_stock} units</div>
              <div className="col-span-2 text-right text-slate-300">{r.DoS.toFixed(1)} days</div>
              <div className="col-span-1 flex justify-center">
                {alertLabel(r) !== 'None' ? (
                  <Badge label={alertLabel(r)} tone={alertTone(r)} />
                ) : (
                  <span className="text-xs text-slate-500">None</span>
                )}
              </div>
              <div className="col-span-2 text-slate-300">{r.store_name}</div>
              <div className="col-span-1 flex justify-center">
                <Badge label={r.classification} tone={r.classification === 'Fast' ? 'green' : r.classification === 'Slow' ? 'red' : 'slate'} />
              </div>
            </div>
          ))}
          {!loading && filteredRows.length === 0 ? (
            <div className="px-4 py-8">
              <Status title="No inventory data to display" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Showing {filteredRows.length} of {enrichedRows.length} SKU entries
        {searchQuery && ` · Filtered by "${searchQuery}"`}
      </div>
    </div>
  )
}
