export interface User {
  id: number
  email: string
  username: string
  display_name: string | null
  is_verified: boolean
  is_superuser: boolean
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
}