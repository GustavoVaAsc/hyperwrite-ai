import { useEffect, useState } from 'react'
import { getApiUrl } from '../services/api'
import { ROUTES, ERROR_MESSAGES } from '../constants/app'
import { useNotificationStore } from '../store/notificationStore'
import styles from './Home.module.css'

export function Home() {
  const [message, setMessage] = useState<string>(ERROR_MESSAGES.CONNECTING)
  const addAlert = useNotificationStore((s) => s.addAlert)

  useEffect(() => {
    const apiUrl = getApiUrl()

    fetch(`${apiUrl}${ROUTES.HOME}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => setMessage(data.message))
      .catch(() => {
        addAlert('error', ERROR_MESSAGES.BACKEND_CONNECTION)
      })
  }, [addAlert])

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Hyperwrite AI</h1>
      <p className={styles.status}>Backend status: <strong>{message}</strong></p>
    </div>
  )
}