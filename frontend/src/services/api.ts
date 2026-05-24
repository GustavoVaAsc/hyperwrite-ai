import { useAuthStore } from '../store/authStore'

export const getApiUrl = () => import.meta.env.VITE_API_URL

export const getHeaders = () => {
  const token = useAuthStore.getState().accessToken
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const getHeadersNoContentType = () => {
  const token = useAuthStore.getState().accessToken
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}