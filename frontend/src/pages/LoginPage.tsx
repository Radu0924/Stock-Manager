import { useState, type FormEvent } from 'react'
import { Package, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-panel-bg">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
            <Package className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">Stock Manager</h1>
          <p className="text-sm text-slate-400">Sign in to your account</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-panel-border bg-panel-surface p-6 shadow-lg"
        >
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <label className="mb-1 block text-xs font-medium text-slate-400" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mb-4 block w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            placeholder="Enter username"
          />

          <label className="mb-1 block text-xs font-medium text-slate-400" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-6 block w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            placeholder="Enter password"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <p className="mt-4 text-center text-[11px] text-slate-500">
            Demo: use <span className="text-slate-400">admin</span> /{' '}
            <span className="text-slate-400">admin</span>
          </p>
        </form>
      </div>
    </div>
  )
}
