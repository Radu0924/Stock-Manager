type Props = {
  title: string
  children?: React.ReactNode
}

export function RightPanelSection({ title, children }: Props) {
  return (
    <div className="mb-4 rounded-lg border border-panel-border bg-panel-bg p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button
          type="button"
          className="text-slate-500 hover:text-slate-300"
          aria-label="More options"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  )
}
