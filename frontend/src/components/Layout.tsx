import { type ReactNode } from 'react'
import {
  LayoutDashboard,
  Package,
  Map,
  Truck,
  ClipboardList,
  Bell,
  Settings,
  BarChart3,
  Search,
  Circle,
  User,
  FileText,
  LogOut,
} from 'lucide-react'

export type Tab = 'dashboard' | 'inventory' | 'alerts' | 'workflow' | 'alerts-history' | 'insights' | 'map' | 'logistics' | 'settings' | 'audit-logs'

const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'workflow', label: 'Workflow', icon: ClipboardList },
  { id: 'alerts-history', label: 'Alerts History', icon: Bell },
  { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'map', label: 'Interactive Map', icon: Map },
  { id: 'logistics', label: 'Logistics', icon: Truck },
  { id: 'settings', label: 'Settings', icon: Settings },
]

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: ReactNode
  rightPanel?: ReactNode
  pageTitle: string
  username?: string
  onLogout?: () => void
}

export function Layout({ activeTab, onTabChange, children, rightPanel, pageTitle, username, onLogout }: Props) {
  return (
    <div className="flex h-full bg-panel-bg">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-panel-border bg-panel-surface">
        <div className="flex h-14 items-center gap-2 border-b border-panel-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
            <Package className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-slate-100">Stock Manager</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-panel-hover text-white'
                    : 'text-slate-400 hover:bg-panel-hover hover:text-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              </button>
            )
          })}

        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-panel-border bg-panel-surface px-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search SKUs, Stores..."
                className="h-9 w-72 rounded-lg border border-panel-border bg-panel-bg pl-9 pr-3 text-sm text-slate-300 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-panel-bg px-3 py-1.5">
              <Circle className="h-2.5 w-2.5 fill-emerald-400 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">System Health</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600">
                <User className="h-4 w-4 text-slate-300" />
              </div>
              <span className="text-sm text-slate-300">{username ?? 'User'}</span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-panel-hover hover:text-slate-200"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <h1 className="mb-6 text-xl font-semibold text-white">{pageTitle}</h1>
            {children}
          </main>

          {/* Right sidebar */}
          {rightPanel && (
            <aside className="w-80 overflow-y-auto border-l border-panel-border bg-panel-surface p-4">
              {rightPanel}
            </aside>
          )}
        </div>

        {/* Bottom status bar */}
        <div className="flex h-8 items-center border-t border-panel-border bg-panel-surface px-6">
          <span className="text-[11px] text-slate-500">Last Sync: just now</span>
        </div>
      </div>
    </div>
  )
}
