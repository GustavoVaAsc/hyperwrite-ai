import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/authStore'

export function Register() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    display_name: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const response = await fetch(`${apiUrl}/auth/register`, {
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

      const loginResponse = await fetch(`${apiUrl}/auth/login`, {
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

      const userResponse = await fetch(`${apiUrl}/users/me`, {
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

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Register</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="display_name">Display Name (optional)</label>
            <input
              id="display_name"
              type="text"
              value={formData.display_name}
              onChange={(e) =>
                setFormData({ ...formData, display_name: e.target.value })
              }
              autoComplete="name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <a href="/login">Login</a>
        </p>
      </div>
    </div>
  )
}