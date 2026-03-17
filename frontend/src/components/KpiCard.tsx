import { type ReactNode } from 'react'

type Props = {
  label: string
  value: string | number
  accent?: 'green' | 'red' | 'amber' | 'blue' | 'default'
  icon?: ReactNode
}

const accentBorder: Record<NonNullable<Props['accent']>, string> = {
  green: 'border-l-emerald-500',
  red: 'border-l-rose-500',
  amber: 'border-l-amber-500',
  blue: 'border-l-sky-500',
  default: 'border-l-slate-500',
}

export function KpiCard({ label, value, accent = 'default', icon }: Props) {
  return (
    <div
      className={`rounded-lg border border-panel-border border-l-4 ${accentBorder[accent]} bg-panel-surface p-4`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
    </div>
  )
}
