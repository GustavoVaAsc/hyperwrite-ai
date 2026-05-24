import { create } from 'zustand'

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

export const useNotificationStore = create<NotificationStore>((set) => ({
  alerts: [],
  addAlert: (type, message) => {
    const id = crypto.randomUUID()
    set((state) => ({
      alerts: [...state.alerts, { id, type, message }],
    }))
    setTimeout(() => {
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id),
      }))
    }, 10000)
  },
  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
}))