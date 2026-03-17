import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip as LeafletTooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { KpiCard } from '../components/KpiCard'
import { RightPanelSection } from '../components/RightPanelSection'
import { fetchJson } from '../lib/api'
import type { DashboardStockRow, DashboardStockResponse, Store, StockoutResponse, WorkflowResponse } from '../lib/types'

// ── Romanian city coordinates ──

const CITY_COORDS: Record<string, [number, number]> = {
  'Bucharest': [44.4268, 26.1025],
  'București': [44.4268, 26.1025],
  'Cluj': [46.7712, 23.6236],
  'Cluj-Napoca': [46.7712, 23.6236],
  'Timisoara': [45.7489, 21.2087],
  'Timișoara': [45.7489, 21.2087],
  'Iasi': [47.1585, 27.6014],
  'Iași': [47.1585, 27.6014],
  'Brasov': [45.6427, 25.5887],
  'Brașov': [45.6427, 25.5887],
  'Craiova': [44.3302, 23.7949],
  'Constanta': [44.1598, 28.6348],
  'Constanța': [44.1598, 28.6348],
  'Galati': [45.4353, 28.0080],
  'Galați': [45.4353, 28.0080],
  'Ploiesti': [44.9462, 26.0254],
  'Ploiești': [44.9462, 26.0254],
  'Oradea': [47.0465, 21.9189],
  'Sibiu': [45.7983, 24.1256],
  'Arad': [46.1866, 21.3123],
}

function getCoords(nameOrCity: string): [number, number] | null {
  for (const [key, val] of Object.entries(CITY_COORDS)) {
    if (nameOrCity.toLowerCase().includes(key.toLowerCase())) return val
  }
  return null
}

// ── Custom marker icons ──

function createIcon(color: string) {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};
      border:3px solid rgba(255,255,255,0.3);
      box-shadow:0 0 12px ${color}88;
      display:flex;align-items:center;justify-content:center;
    ">
      <div style="width:8px;height:8px;border-radius:50%;background:white;opacity:0.9;"></div>
    </div>`,
  })
}

const ICON_GREEN = createIcon('#22c55e')
const ICON_AMBER = createIcon('#f59e0b')
const ICON_RED = createIcon('#ef4444')
const ICON_BLUE = createIcon('#38bdf8')

// ── Types ──

type StoreMapData = {
  store_id: number
  name: string
  city: string
  coords: [number, number]
  totalStock: number
  alertCount: number
  criticalAlerts: number
}

type TransferRoute = {
  from: [number, number]
  to: [number, number]
  fromName: string
  toName: string
  quantity: number
  product: string
}

// ── Auto-fit to bounds ──

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40], maxZoom: 8 })
    } else if (positions.length === 1) {
      map.setView(positions[0], 7)
    }
  }, [map, positions])
  return null
}

// ── OSRM road geometry fetcher ──

// Cache keyed by "lat1,lon1-lat2,lon2"
const roadGeometryCache = new Map<string, [number, number][]>()

async function fetchRoadGeometry(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][]> {
  const key = `${from[0]},${from[1]}-${to[0]},${to[1]}`
  const cached = roadGeometryCache.get(key)
  if (cached) return cached

  try {
    // OSRM expects lon,lat not lat,lon
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    const resp = await fetch(url)
    if (!resp.ok) return [from, to]
    const data = await resp.json()
    const coords: [number, number][] = data.routes?.[0]?.geometry?.coordinates?.map(
      (c: [number, number]) => [c[1], c[0]] as [number, number] // GeoJSON [lon,lat] → Leaflet [lat,lon]
    ) ?? [from, to]
    roadGeometryCache.set(key, coords)
    return coords
  } catch {
    return [from, to] // fallback to straight line
  }
}

type RoadRouteData = {
  fromName: string
  toName: string
  totalQty: number
  count: number
  geometry: [number, number][]
}

/** Hook that resolves all route lines to road-following geometries */
function useRoadRoutes(
  routeLines: { from: [number, number]; to: [number, number]; fromName: string; toName: string; totalQty: number; count: number }[]
): RoadRouteData[] {
  const [resolved, setResolved] = useState<RoadRouteData[]>([])
  const prevKey = useRef('')

  const fetchAll = useCallback(async () => {
    const key = routeLines.map((r) => `${r.from}-${r.to}`).join('|')
    if (key === prevKey.current) return
    prevKey.current = key

    if (routeLines.length === 0) {
      setResolved([])
      return
    }

    // Fetch all road geometries in parallel (with small batching to be polite to public OSRM)
    const results: RoadRouteData[] = []
    const batchSize = 4
    for (let i = 0; i < routeLines.length; i += batchSize) {
      const batch = routeLines.slice(i, i + batchSize)
      const geometries = await Promise.all(
        batch.map((r) => fetchRoadGeometry(r.from, r.to))
      )
      for (let j = 0; j < batch.length; j++) {
        results.push({
          fromName: batch[j].fromName,
          toName: batch[j].toName,
          totalQty: batch[j].totalQty,
          count: batch[j].count,
          geometry: geometries[j],
        })
      }
    }
    setResolved(results)
  }, [routeLines])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return resolved
}

// ── Main page ──

export function InteractiveMapPage({ onStoreDataChange }: { onStoreDataChange?: (data: StoreMapData[]) => void }) {
  const [stores, setStores] = useState<Store[]>([])
  const [stockData, setStockData] = useState<DashboardStockRow[]>([])
  const [alertData, setAlertData] = useState<StockoutResponse | null>(null)
  const [workflowData, setWorkflowData] = useState<WorkflowResponse | null>(null)
  const [selectedStore, setSelectedStore] = useState<StoreMapData | null>(null)
  const [showRoutes, setShowRoutes] = useState(true)
  const [loading, setLoading] = useState(true)

  // Fetch all data
  useEffect(() => {
    let cancelled = false
    const safeJson = <T,>(path: string, fallback: T) =>
      fetchJson<T>(path).catch(() => fallback)

    Promise.all([
      safeJson<Store[]>('/api/stores', []),
      safeJson<DashboardStockResponse>('/api/dashboard/stock', { rows: [] }),
      safeJson<StockoutResponse>('/api/alerts/stockout?days=120', { threshold_DoS: 5, rows: [] }),
      safeJson<WorkflowResponse>('/api/workflow/transfers/suggestions', { meta: {}, items: [] }),
    ])
      .then(([s, d, a, w]) => {
        if (cancelled) return
        setStores(s)
        setStockData(d.rows)
        setAlertData(a)
        setWorkflowData(w)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Build per-store map data
  const storeMapData = useMemo<StoreMapData[]>(() => {
    return stores.map((s) => {
      const coords = getCoords(s.city ?? s.name)
      const stockRow = stockData.find((r) => r.store_id === s.store_id)
      const alerts = alertData?.rows.filter((r) => r.store_id === s.store_id) ?? []
      const critical = alerts.filter((r) => r.DoS < (alertData?.threshold_DoS ?? 5) * 0.4)
      return {
        store_id: s.store_id,
        name: s.name,
        city: s.city ?? '',
        coords: coords ?? [45.9432, 24.9668], // center of Romania fallback
        totalStock: stockRow?.total_quantity ?? 0,
        alertCount: alerts.length,
        criticalAlerts: critical.length,
      }
    })
  }, [stores, stockData, alertData])

  // Push data to right panel via parent
  useEffect(() => {
    onStoreDataChange?.(storeMapData)
  }, [storeMapData, onStoreDataChange])

  // Build transfer routes from workflow data, or generate illustrative routes from alert data
  const routes = useMemo<TransferRoute[]>(() => {
    const storeById = new Map(stores.map((s) => [s.store_id, s]))
    const result: TransferRoute[] = []

    // Try real workflow data first
    if (workflowData && workflowData.items.length > 0) {
      for (const item of workflowData.items) {
        for (const order of item.orders) {
          const src = storeById.get(order.source_id)
          const dst = storeById.get(order.destination_id)
          if (!src || !dst) continue
          const fromCoords = getCoords(src.city ?? src.name)
          const toCoords = getCoords(dst.city ?? dst.name)
          if (!fromCoords || !toCoords) continue
          result.push({
            from: fromCoords,
            to: toCoords,
            fromName: src.name,
            toName: dst.name,
            quantity: order.quantity,
            product: `${item.product_name} (${item.size})`,
          })
        }
      }
    }

    // Fallback: fully connected mesh — every store linked to every other store
    if (result.length === 0 && storeMapData.length > 1) {
      for (let i = 0; i < storeMapData.length; i++) {
        for (let j = i + 1; j < storeMapData.length; j++) {
          const src = storeMapData[i]
          const dst = storeMapData[j]
          result.push({
            from: src.coords,
            to: dst.coords,
            fromName: src.name,
            toName: dst.name,
            quantity: Math.round(Math.min(Math.max(src.totalStock, dst.totalStock) * 0.03, 30)),
            product: 'Suggested transfer',
          })
        }
      }
    }

    return result
  }, [workflowData, stores, alertData, storeMapData])

  // Deduplicated route lines (aggregate overlapping routes)
  const routeLines = useMemo(() => {
    const map = new Map<string, { from: [number, number]; to: [number, number]; fromName: string; toName: string; totalQty: number; count: number }>()
    for (const r of routes) {
      const key = `${r.from[0]},${r.from[1]}-${r.to[0]},${r.to[1]}`
      const existing = map.get(key)
      if (existing) {
        existing.totalQty += r.quantity
        existing.count += 1
      } else {
        map.set(key, { from: r.from, to: r.to, fromName: r.fromName, toName: r.toName, totalQty: r.quantity, count: 1 })
      }
    }
    return Array.from(map.values())
  }, [routes])

  const roadRoutes = useRoadRoutes(routeLines)

  const positions = storeMapData.map((s) => s.coords)

  // KPI stats
  const totalStores = storeMapData.length
  const storesWithAlerts = storeMapData.filter((s) => s.alertCount > 0).length
  const totalAlerts = storeMapData.reduce((s, r) => s + r.alertCount, 0)
  const activeRoutes = roadRoutes.length

  function getMarkerIcon(store: StoreMapData) {
    if (store.criticalAlerts > 0) return ICON_RED
    if (store.alertCount > 0) return ICON_AMBER
    if (store.totalStock > 0) return ICON_GREEN
    return ICON_BLUE
  }

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
        <KpiCard label="Active Stores" value={totalStores} accent="green" />
        <KpiCard label="Stores with Alerts" value={storesWithAlerts} accent="amber" />
        <KpiCard label="Total Alerts" value={totalAlerts} accent="red" />
        <KpiCard label="Active Transfer Routes" value={activeRoutes} accent="blue" />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showRoutes}
            onChange={(e) => setShowRoutes(e.target.checked)}
            className="h-4 w-4 rounded border-panel-border bg-panel-bg accent-emerald-500"
          />
          Show Transfer Routes
        </label>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> Healthy</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Warnings</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500" /> Critical</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" /> No Data</span>
        </div>
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-xl border border-panel-border" style={{ height: 520 }}>
        <MapContainer
          center={[45.9432, 24.9668]}
          zoom={7}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#0f1923' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds positions={positions} />

          {storeMapData.map((store) => (
            <Marker
              key={store.store_id}
              position={store.coords}
              icon={getMarkerIcon(store)}
              eventHandlers={{ click: () => setSelectedStore(store) }}
            >
              <Popup>
                <div style={{ color: '#e2e8f0', background: '#162231', padding: '8px 12px', borderRadius: 8, minWidth: 180, fontSize: 13 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{store.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{store.city}</div>
                  <hr style={{ border: 'none', borderTop: '1px solid #1e3347', margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>Total Stock</span>
                    <span style={{ fontWeight: 600 }}>{store.totalStock.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>Alerts</span>
                    <span style={{ fontWeight: 600, color: store.alertCount > 0 ? '#f59e0b' : '#22c55e' }}>{store.alertCount}</span>
                  </div>
                  {store.criticalAlerts > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#94a3b8' }}>Critical</span>
                      <span style={{ fontWeight: 600, color: '#ef4444' }}>{store.criticalAlerts}</span>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {showRoutes && roadRoutes.map((route, i) => (
            <Polyline
              key={i}
              positions={route.geometry}
              pathOptions={{
                color: '#38bdf8',
                weight: Math.min(1.5 + route.count * 0.5, 4),
                opacity: 0.6,
                dashArray: '8 6',
              }}
            >
              <LeafletTooltip sticky>
                <span style={{ color: '#e2e8f0', fontSize: 11 }}>
                  {route.fromName} → {route.toName} ({route.count} transfer{route.count !== 1 ? 's' : ''}, {route.totalQty} units)
                </span>
              </LeafletTooltip>
            </Polyline>
          ))}
        </MapContainer>
      </div>

      {/* Selected store detail */}
      {selectedStore && (
        <div className="rounded-xl border border-panel-border bg-panel-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">{selectedStore.name}</h3>
              <p className="text-xs text-slate-400">{selectedStore.city}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStore(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-panel-bg p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Stock</p>
              <p className="mt-1 text-lg font-bold text-white">{selectedStore.totalStock.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-panel-bg p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Alerts</p>
              <p className={`mt-1 text-lg font-bold ${selectedStore.alertCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{selectedStore.alertCount}</p>
            </div>
            <div className="rounded-lg bg-panel-bg p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Critical</p>
              <p className={`mt-1 text-lg font-bold ${selectedStore.criticalAlerts > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedStore.criticalAlerts}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Right Panel ──

export function InteractiveMapRightPanel({ storeData }: { storeData: StoreMapData[] }) {
  const sorted = useMemo(() => [...storeData].sort((a, b) => b.alertCount - a.alertCount), [storeData])
  const totalStock = storeData.reduce((s, r) => s + r.totalStock, 0)

  return (
    <div className="space-y-5">
      <RightPanelSection title="Store Overview">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Total Stores</span>
            <span className="font-semibold text-white">{storeData.length}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Total Stock Units</span>
            <span className="font-semibold text-white">{totalStock.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Healthy Stores</span>
            <span className="font-semibold text-emerald-400">{storeData.filter((s) => s.alertCount === 0).length}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Stores with Alerts</span>
            <span className="font-semibold text-amber-400">{storeData.filter((s) => s.alertCount > 0).length}</span>
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Alert Ranking">
        <div className="space-y-2">
          {sorted.slice(0, 8).map((s) => (
            <div key={s.store_id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    s.criticalAlerts > 0 ? 'bg-rose-500' : s.alertCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                <span className="text-slate-300">{s.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{s.totalStock.toLocaleString()} units</span>
                {s.alertCount > 0 ? (
                  <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400">
                    {s.alertCount}
                  </span>
                ) : (
                  <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">OK</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </RightPanelSection>

      <RightPanelSection title="Map Legend">
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>Healthy — no stockout alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span>Warning — has active alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <span>Critical — has critical alerts (DoS &lt; 2)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-sky-500" />
            <span>No stock data available</span>
          </div>
          <hr className="border-panel-border" />
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-6 border-t-2 border-dashed border-sky-400" />
            <span>Suggested transfer route</span>
          </div>
        </div>
      </RightPanelSection>
    </div>
  )
}

// Re-export type for App.tsx usage
export type { StoreMapData }
