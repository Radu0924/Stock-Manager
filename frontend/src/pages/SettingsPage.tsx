import { useState } from 'react'
import { Save, RotateCcw, Info } from 'lucide-react'
import { KpiCard } from '../components/KpiCard'

type ThresholdConfig = {
  DoS_target: number
  safety_factor: number
  stockout_threshold: number
  auto_threshold: number
  min_roi: number
  w1: number
  w2: number
  w3: number
}

const DEFAULTS: ThresholdConfig = {
  DoS_target: 15,
  safety_factor: 0.2,
  stockout_threshold: 5,
  auto_threshold: 20,
  min_roi: 1.5,
  w1: 0.5,
  w2: 0.3,
  w3: 0.2,
}

type FieldDef = {
  key: keyof ThresholdConfig
  label: string
  desc: string
  min: number
  max: number
  step: number
  unit: string
}

const FIELDS: FieldDef[] = [
  { key: 'DoS_target', label: 'DoS Target', desc: 'Target Days of Supply to maintain', min: 1, max: 60, step: 1, unit: 'days' },
  { key: 'safety_factor', label: 'Safety Factor', desc: 'Safety stock buffer as a percentage', min: 0, max: 1, step: 0.05, unit: '%' },
  { key: 'stockout_threshold', label: 'Stockout Threshold', desc: 'DoS below which an item is flagged as stockout', min: 1, max: 30, step: 1, unit: 'days' },
  { key: 'auto_threshold', label: 'Auto Transfer Threshold', desc: 'Max transfer quantity that gets auto-approved', min: 1, max: 100, step: 1, unit: 'units' },
  { key: 'min_roi', label: 'Minimum ROI', desc: 'Minimum return on investment for transfer approval', min: 0, max: 10, step: 0.1, unit: 'x' },
]

const WEIGHT_FIELDS: FieldDef[] = [
  { key: 'w1', label: 'Weight — DoS Urgency (w1)', desc: 'Priority weight for urgency based on Days of Supply', min: 0, max: 1, step: 0.05, unit: '' },
  { key: 'w2', label: 'Weight — Free Capacity (w2)', desc: 'Priority weight for destination free capacity', min: 0, max: 1, step: 0.05, unit: '' },
  { key: 'w3', label: 'Weight — Route Cost (w3)', desc: 'Priority weight for transfer route cost', min: 0, max: 1, step: 0.05, unit: '' },
]

export function SettingsPage() {
  const [config, setConfig] = useState<ThresholdConfig>({ ...DEFAULTS })
  const [saved, setSaved] = useState(false)

  const update = (key: keyof ThresholdConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const reset = () => {
    setConfig({ ...DEFAULTS })
    setSaved(false)
  }

  const handleSave = () => {
    // TODO: PUT /api/settings when backend is ready
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const weightsSum = config.w1 + config.w2 + config.w3
  const weightsValid = Math.abs(weightsSum - 1) < 0.01

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="DoS Target" value={`${config.DoS_target}d`} accent="green" />
        <KpiCard label="Safety Factor" value={`${(config.safety_factor * 100).toFixed(0)}%`} accent="blue" />
        <KpiCard label="Stockout Threshold" value={`${config.stockout_threshold}d`} accent="red" />
        <KpiCard label="Min ROI" value={`${config.min_roi}x`} accent="amber" />
      </div>

      {/* Algorithm thresholds */}
      <section className="rounded-xl border border-panel-border bg-panel-surface p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Algorithm Thresholds</h2>
        <div className="space-y-5">
          {FIELDS.map((f) => (
            <ThresholdRow key={f.key} field={f} value={config[f.key]} onChange={(v) => update(f.key, v)} />
          ))}
        </div>
      </section>

      {/* Scoring weights */}
      <section className="rounded-xl border border-panel-border bg-panel-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Scoring Weights</h2>
          {!weightsValid && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Info className="h-3.5 w-3.5" />
              Weights must sum to 1.00 (current: {weightsSum.toFixed(2)})
            </span>
          )}
        </div>
        <div className="space-y-5">
          {WEIGHT_FIELDS.map((f) => (
            <ThresholdRow key={f.key} field={f} value={config[f.key]} onChange={(v) => update(f.key, v)} />
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!weightsValid}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-panel-border px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-panel-hover"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Settings are saved locally for now. Once the backend delivers <code className="text-slate-400">PUT /api/settings</code>, changes will persist server-side.
      </p>
    </div>
  )
}

/* Right panel for Settings */
export function SettingsRightPanel() {
  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Configuration Guide</h3>
        <div className="space-y-3 text-xs text-slate-400">
          <div className="rounded-lg bg-panel-bg p-3">
            <p className="mb-1 font-medium text-slate-300">DoS Target</p>
            <p>Days of Supply target. Higher = more safety stock, lower = leaner operations.</p>
          </div>
          <div className="rounded-lg bg-panel-bg p-3">
            <p className="mb-1 font-medium text-slate-300">Safety Factor</p>
            <p>Buffer percentage added on top of calculated needs to absorb demand variation.</p>
          </div>
          <div className="rounded-lg bg-panel-bg p-3">
            <p className="mb-1 font-medium text-slate-300">Stockout Threshold</p>
            <p>Items with DoS below this value trigger stockout alerts and transfer suggestions.</p>
          </div>
          <div className="rounded-lg bg-panel-bg p-3">
            <p className="mb-1 font-medium text-slate-300">Auto Transfer Threshold</p>
            <p>Transfers with quantity ≤ this value are auto-approved. Larger transfers need manager sign-off.</p>
          </div>
          <div className="rounded-lg bg-panel-bg p-3">
            <p className="mb-1 font-medium text-slate-300">Scoring Weights</p>
            <p>Control how the greedy allocation algorithm prioritises destinations. Must sum to 1.00.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

/* Slider + input row */
function ThresholdRow({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-medium text-slate-200">{field.label}</label>
        <span className="text-xs text-slate-400">
          {field.unit === '%' ? `${(value * 100).toFixed(0)}%` : `${value}${field.unit ? ` ${field.unit}` : ''}`}
        </span>
      </div>
      <p className="mb-2 text-[11px] text-slate-500">{field.desc}</p>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-panel-border accent-emerald-500 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500"
        />
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value)
            if (!isNaN(v) && v >= field.min && v <= field.max) onChange(v)
          }}
          className="w-20 rounded-lg border border-panel-border bg-panel-bg px-2 py-1 text-right text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />
      </div>
    </div>
  )
}
