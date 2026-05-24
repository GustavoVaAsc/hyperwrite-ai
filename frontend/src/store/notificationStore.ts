import { create } from 'zustand'
import { TIMING } from '../constants/app'

export type AlertType = 'success' | 'warning' | 'error'

export interface Alert {
  id: string
  type: AlertType
  message: string
}

interface NotificationStore {
  alerts: Alert[]
  addAlert: (type: AlertType, message: string) => void
  removeAlert: (id: string) => void
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  alerts: [],
  addAlert: (type, message) => {
    const id = crypto.randomUUID()
    set((state) => ({
      alerts: [...state.alerts, { id, type, message }],
    }))
    setTimeout(() => {
      const { alerts } = get()
      if (alerts.some((a) => a.id === id)) {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }))
      }
    }, TIMING.NOTIFICATION_DURATION_MS)
  },
  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
}))