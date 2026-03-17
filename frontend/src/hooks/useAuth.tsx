import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type User = {
  id: number
  username: string
  role: 'admin' | 'manager' | 'viewer'
}

type AuthState = {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  error: string | null
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * Stub provider — currently uses localStorage mock.
 * Swap fetch calls to real POST /api/auth/login when backend is ready.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('auth_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored) as User)
      } catch {
        localStorage.removeItem('auth_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setError(null)
    setIsLoading(true)
    try {
      // TODO: Replace with real API call: POST /api/auth/login
      // const res = await fetchJson<{ user: User; token: string }>('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ username, password }),
      // })
      // setUser(res.user)
      // localStorage.setItem('auth_token', res.token)

      // Stub: accept admin/admin or any non-empty credentials
      await new Promise((r) => setTimeout(r, 600))
      if (!username || !password) throw new Error('Username and password are required')
      if (username === 'admin' && password !== 'admin') throw new Error('Invalid credentials')

      const stubUser: User = { id: 1, username, role: 'admin' }
      setUser(stubUser)
      localStorage.setItem('auth_user', JSON.stringify(stubUser))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
