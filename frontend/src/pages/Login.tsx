import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/authStore'
import './Login.css'

function IconUser() {
  return (
    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

export function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [formData, setFormData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: formData.username,
          password: formData.password,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Login failed')
      }

      const data = await response.json()

      const userResponse = await fetch(`${apiUrl}/users/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })

      if (!userResponse.ok) throw new Error('Failed to fetch user data')

      const userData = await userResponse.json()
      login(userData, data.access_token)
      navigate({ to: '/files' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-grid-bg" />
      <div className="glow glow-purple" />
      <div className="glow glow-cyan" />
      <div className="glow glow-pink" />

      <nav className="login-nav">
        <div className="login-logo">
          <span className="login-logo-dot" />
          Hyperwrite AI
        </div>
        <div className="login-nav-links">
          <a href="/login" className="nav-link">Login</a>
          <a href="/register" className="nav-link">Register</a>
        </div>
      </nav>

      <main className="login-main">
        <div className="login-wrapper">
          <div className="login-eyebrow">
            the state of the art document editor
          </div>
          <h1 className="login-title">
            Welcome <span className="login-title-accent">back.</span>
          </h1>
          <p className="login-sub">{'Sign in to continue writing'}</p>

          <div className="login-card">
            <div className="card-top-line" />

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error">
                  <IconAlert />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="username">Email or Username</label>
                <div className="input-wrap">
                  <IconUser />
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="you@example.com"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <IconLock />
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    Signing in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            <div className="login-divider">
              <span />
              or
              <span />
            </div>

            <p className="auth-link">
              Don't have an account? <a href="/register">Register →</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
