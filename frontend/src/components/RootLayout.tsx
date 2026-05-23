import { Outlet, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/authStore'

export function RootLayout() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div>
      <nav className="nav">
        <div className="nav-brand">
          <a href="/">Hyperwrite AI</a>
        </div>
        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <a href="/files">Files</a>
              <a href="/knowledge">Knowledge</a>
              <span className="nav-user">{user?.username}</span>
              <button onClick={handleLogout} className="nav-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <a href="/login">Login</a>
              <a href="/register">Register</a>
            </>
          )}
        </div>
      </nav>
      <Outlet />
    </div>
  )
}