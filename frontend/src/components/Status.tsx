type Props = {
  title: string
  detail?: string
  tone?: 'slate' | 'red'
}

export function Status({ title, detail, tone = 'slate' }: Props) {
  const border = tone === 'red' ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-panel-border bg-panel-surface text-slate-300'
  const detailColor = tone === 'red' ? 'text-rose-400/80' : 'text-slate-400'

  return (
    <div className={`rounded-lg border p-4 ${border}`}>
      <div className="text-sm font-medium">{title}</div>
      {detail ? <div className={`mt-1 text-sm ${detailColor}`}>{detail}</div> : null}
    </div>
  )
}

