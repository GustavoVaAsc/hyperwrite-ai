import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/authStore'
import { getApiUrl } from '../services/api'
import { API_ROUTES } from '../constants/app'
import './Register.css'

function IconMail() {
  return (
    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconTag() {
  return (
    <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" strokeWidth={2} />
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

export function Register() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    display_name: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const getPasswordStrength = (pass: string) => {
    let strength = 0
    if (pass.length >= 8) strength += 1
    if (/[A-Z]/.test(pass)) strength += 1
    if (/[a-z]/.test(pass)) strength += 1
    if (/[0-9]/.test(pass)) strength += 1
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1
    return strength
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const strength = getPasswordStrength(formData.password)
    if (strength < 3) {
      setError('Password is too weak. Include at least 8 characters, uppercase, and numbers.')
      return
    }

    setIsLoading(true)

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}${API_ROUTES.AUTH_REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          password: formData.password,
          display_name: formData.display_name || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Registration failed')
      }

      const loginResponse = await fetch(`${apiUrl}${API_ROUTES.AUTH_LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: formData.email,
          password: formData.password,
        }),
      })

      if (!loginResponse.ok) {
        throw new Error('Registration successful but login failed')
      }

      const data = await loginResponse.json()

      const userResponse = await fetch(`${apiUrl}${API_ROUTES.USERS_ME}`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      })

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data')
      }

      const userData = await userResponse.json()
      login(userData, data.access_token)

      navigate({ to: '/files' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const strength = getPasswordStrength(formData.password)

  return (
    <div className="register-page">
      <div className="register-grid-bg" />
      <div className="glow glow-purple" />
      <div className="glow glow-cyan" />
      <div className="glow glow-pink" />

      <nav className="register-nav">
        <div className="register-logo">
          <span className="register-logo-dot" />
          Hyperwrite AI
        </div>
        <div className="register-nav-links">
          <a href="/login" className="nav-link">Login</a>
          <a href="/register" className="nav-link">Register</a>
        </div>
      </nav>

      <main className="register-main">
        <div className="register-wrapper">
          <h1 className="register-title">
            Join <span className="register-title-accent">us.</span>
          </h1>
          <p className="register-sub">Sign up to start writing</p>

          <div className="register-card">
            <div className="card-top-line" />

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error">
                  <IconAlert />
                  <span>{error}</span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrap">
                  <IconMail />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className="input-wrap">
                  <IconUser />
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="johndoe"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="display_name">Display Name (optional)</label>
                <div className="input-wrap">
                  <IconTag />
                  <input
                    id="display_name"
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="John Doe"
                    autoComplete="name"
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
                    autoComplete="new-password"
                  />
                </div>
                {formData.password && (
                  <div className="password-strength">
                    <div className="strength-bars">
                      <div className={`strength-bar ${strength >= 1 ? (strength <= 2 ? 'active weak' : strength <= 4 ? 'active medium' : 'active strong') : ''}`} />
                      <div className={`strength-bar ${strength >= 3 ? (strength <= 4 ? 'active medium' : 'active strong') : ''}`} />
                      <div className={`strength-bar ${strength >= 5 ? 'active strong' : ''}`} />
                    </div>
                    <span className={`strength-text ${strength <= 2 ? 'weak' : strength <= 4 ? 'medium' : 'strong'}`}>
                      {strength <= 2 ? 'Weak' : strength <= 4 ? 'Medium' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrap">
                  <IconLock />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    Creating account...
                  </>
                ) : (
                  'Register'
                )}
              </button>
            </form>

            <div className="register-divider">
              <span />
              or
              <span />
            </div>

            <p className="auth-link">
              Already have an account? <a href="/login">Login →</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}