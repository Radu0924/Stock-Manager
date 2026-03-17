import type { ChangeEvent } from 'react'

type Option = {
  label: string
  value: string
}

type Props = {
  value: string
  onChange: (value: string) => void
  options: Option[]
  className?: string
}

export function Select({ value, onChange, options, className }: Props) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)
  return (
    <select
      value={value}
      onChange={handleChange}
      className={`h-9 rounded-lg border border-panel-border bg-panel-bg px-3 text-sm text-slate-300 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 ${className ?? ''}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

