type Props = {
  label: string
  tone: 'green' | 'blue' | 'slate' | 'red'
}

const toneClasses: Record<Props['tone'], string> = {
  green: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  blue: 'bg-sky-500/15 text-sky-400 ring-sky-500/30',
  slate: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
  red: 'bg-rose-500/15 text-rose-400 ring-rose-500/30',
}

export function Badge({ label, tone }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {label}
    </span>
  )
}
