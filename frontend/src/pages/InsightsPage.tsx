import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { KpiCard } from '../components/KpiCard'
import { RightPanelSection } from '../components/RightPanelSection'

// ── Mock data generators ──

const STORES = ['Bucharest', 'Cluj', 'Timisoara', 'Iasi', 'Brasov', 'Craiova', 'Constanta', 'Galati', 'Ploiesti', 'Oradea']
const MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

function seed(s: number) {
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

function generateDemandTrend() {
  const rng = seed(42)
  return MONTHS.map((month) => ({
    month,
    demand: Math.round(800 + rng() * 400),
    fulfilled: Math.round(700 + rng() * 350),
  }))
}

function generateStockoutFrequency() {
  const rng = seed(99)
  return MONTHS.map((month) => ({
    month,
    critical: Math.round(rng() * 12),
    warning: Math.round(rng() * 25),
    low: Math.round(rng() * 18),
  }))
}

function generateTransferEfficiency() {
  const rng = seed(77)
  return MONTHS.map((month) => ({
    month,
    suggested: Math.round(30 + rng() * 40),
    executed: Math.round(20 + rng() * 35),
    autoApproved: Math.round(10 + rng() * 20),
  }))
}

function generateCategoryBreakdown() {
  const rng = seed(55)
  const categories = ['Footwear', 'Apparel', 'Accessories', 'Outerwear', 'Sportswear']
  return categories.map((name) => ({
    name,
    value: Math.round(100 + rng() * 500),
  }))
}

function generateStorePerformance() {
  const rng = seed(33)
  return STORES.map((store) => ({
    store,
    score: Math.round(60 + rng() * 40),
    avgDoS: +(5 + rng() * 20).toFixed(1),
    stockouts: Math.round(rng() * 15),
  }))
}

function generateForecastAccuracy() {
  const rng = seed(22)
  return MONTHS.map((month) => ({
    month,
    accuracy: Math.round(70 + rng() * 25),
  }))
}

// ── Chart theme ──

const CHART_TOOLTIP = {
  contentStyle: { background: '#162231', border: '1px solid #1e3347', borderRadius: 8, fontSize: 12, color: '#e2e8f0' },
  itemStyle: { color: '#e2e8f0' },
}

const PIE_COLORS = ['#22c55e', '#38bdf8', '#f59e0b', '#ef4444', '#a78bfa']

// ── Main page ──

export function InsightsPage() {
  const [timeRange, setTimeRange] = useState<'7m' | '3m' | '1m'>('7m')

  const demandTrend = useMemo(() => generateDemandTrend(), [])
  const stockoutFreq = useMemo(() => generateStockoutFrequency(), [])
  const transferEff = useMemo(() => generateTransferEfficiency(), [])
  const storePerf = useMemo(() => generateStorePerformance(), [])
  const forecastAcc = useMemo(() => generateForecastAccuracy(), [])

  const sliceCount = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : 7

  const avgAccuracy = Math.round(forecastAcc.reduce((s, r) => s + r.accuracy, 0) / forecastAcc.length)
  const totalTransfers = transferEff.reduce((s, r) => s + r.executed, 0)
  const fulfillmentRate = Math.round(
    (demandTrend.reduce((s, r) => s + r.fulfilled, 0) / demandTrend.reduce((s, r) => s + r.demand, 0)) * 100
  )
  const totalStockouts = stockoutFreq.reduce((s, r) => s + r.critical + r.warning + r.low, 0)

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Fulfillment Rate" value={`${fulfillmentRate}%`} accent="green" icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} />
        <KpiCard label="Forecast Accuracy" value={`${avgAccuracy}%`} accent="blue" icon={<TrendingUp className="h-4 w-4 text-sky-400" />} />
        <KpiCard label="Transfers Executed" value={totalTransfers} accent="amber" icon={<Minus className="h-4 w-4 text-amber-400" />} />
        <KpiCard label="Total Stockout Events" value={totalStockouts} accent="red" icon={<TrendingDown className="h-4 w-4 text-rose-400" />} />
      </div>

      {/* Time range filter */}
      <div className="flex items-center gap-2">
        {(['7m', '3m', '1m'] as const).map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => setTimeRange(range)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              timeRange === range
                ? 'bg-emerald-600 text-white'
                : 'border border-panel-border text-slate-400 hover:bg-panel-hover hover:text-slate-200'
            }`}
          >
            {range === '7m' ? '7 Months' : range === '3m' ? '3 Months' : '1 Month'}
          </button>
        ))}
      </div>

      {/* Row 1: Demand Trend + Stockout Frequency */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Demand vs Fulfillment">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={demandTrend.slice(-sliceCount)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fulfilledGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3347" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP} />
              <Area type="monotone" dataKey="demand" stroke="#38bdf8" fill="url(#demandGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="fulfilled" stroke="#22c55e" fill="url(#fulfilledGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: '#38bdf8', label: 'Demand' }, { color: '#22c55e', label: 'Fulfilled' }]} />
        </ChartCard>

        <ChartCard title="Stockout Events by Severity">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stockoutFreq.slice(-sliceCount)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3347" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="warning" stackId="a" fill="#f59e0b" />
              <Bar dataKey="low" stackId="a" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: '#ef4444', label: 'Critical' }, { color: '#f59e0b', label: 'Warning' }, { color: '#38bdf8', label: 'Low' }]} />
        </ChartCard>
      </div>

      {/* Row 2: Transfer Efficiency + Forecast Accuracy */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Transfer Efficiency">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={transferEff.slice(-sliceCount)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3347" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="suggested" fill="#64748b" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="executed" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="autoApproved" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
          <ChartLegend items={[{ color: '#64748b', label: 'Suggested' }, { color: '#22c55e', label: 'Executed' }, { color: '#38bdf8', label: 'Auto-Approved' }]} />
        </ChartCard>

        <ChartCard title="Forecast Accuracy Trend">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={forecastAcc.slice(-sliceCount)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3347" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_TOOLTIP} />
              <Line type="monotone" dataKey="accuracy" stroke="#a78bfa" strokeWidth={2.5} dot={{ fill: '#a78bfa', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Store Performance Table */}
      <ChartCard title="Store Performance Ranking">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-panel-border text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Store</th>
                <th className="px-3 py-2 text-right font-medium">Score</th>
                <th className="px-3 py-2 text-right font-medium">Avg DoS</th>
                <th className="px-3 py-2 text-right font-medium">Stockouts</th>
                <th className="px-3 py-2 font-medium">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border">
              {storePerf
                .sort((a, b) => b.score - a.score)
                .map((s, i) => (
                  <tr key={s.store} className="transition-colors hover:bg-panel-hover">
                    <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-200">{s.store}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-white">{s.score}</td>
                    <td className="px-3 py-2.5 text-right text-slate-300">{s.avgDoS}d</td>
                    <td className="px-3 py-2.5 text-right text-slate-300">{s.stockouts}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-panel-border">
                          <div
                            className={`h-full rounded-full ${s.score >= 85 ? 'bg-emerald-500' : s.score >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${s.score >= 85 ? 'text-emerald-400' : s.score >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {s.score >= 85 ? 'Excellent' : s.score >= 70 ? 'Good' : 'Needs Attention'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

// ── Right Panel ──

export function InsightsRightPanel() {
  const categoryBreakdown = useMemo(() => generateCategoryBreakdown(), [])
  const storePerf = useMemo(() => generateStorePerformance(), [])

  const topStore = [...storePerf].sort((a, b) => b.score - a.score)[0]
  const worstStore = [...storePerf].sort((a, b) => a.score - b.score)[0]

  return (
    <div className="space-y-5">
      <RightPanelSection title="Stock by Category">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={categoryBreakdown}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
              stroke="none"
            >
              {categoryBreakdown.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...CHART_TOOLTIP} />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => <span className="text-[10px] text-slate-400">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </RightPanelSection>

      <RightPanelSection title="Key Takeaways">
        <div className="space-y-2.5 text-xs">
          <div className="rounded-lg bg-emerald-500/10 p-2.5">
            <p className="mb-0.5 font-medium text-emerald-400">Best Performing Store</p>
            <p className="text-slate-400">{topStore?.store} — score {topStore?.score}, avg {topStore?.avgDoS}d DoS</p>
          </div>
          <div className="rounded-lg bg-rose-500/10 p-2.5">
            <p className="mb-0.5 font-medium text-rose-400">Needs Attention</p>
            <p className="text-slate-400">{worstStore?.store} — score {worstStore?.score}, {worstStore?.stockouts} stockout events</p>
          </div>
          <div className="rounded-lg bg-sky-500/10 p-2.5">
            <p className="mb-0.5 font-medium text-sky-400">Trend</p>
            <p className="text-slate-400">Fulfillment rate trending upward over the last 3 months. Transfer auto-approval reducing manual review burden.</p>
          </div>
        </div>
      </RightPanelSection>

      <RightPanelSection title="Recommendations">
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
            <p>Increase safety stock for {worstStore?.store} to reduce stockout frequency.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
            <p>Consider raising auto-approval threshold — current auto-rate is healthy.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-500" />
            <p>Deploy 3-tier alerting for earlier stockout intervention.</p>
          </div>
        </div>
      </RightPanelSection>
    </div>
  )
}

// ── Shared helpers ──

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-panel-border bg-panel-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  )
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 flex items-center gap-4">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
