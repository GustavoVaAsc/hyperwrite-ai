import { type JSX } from 'react'
import { useNotificationStore, type Alert } from '../../store/notificationStore'
import styles from './AlertNotification.module.css'

function AlertItem({ alert }: { alert: Alert }): JSX.Element {
  const removeAlert = useNotificationStore((s) => s.removeAlert)

  return (
    <div className={`${styles.alert} ${styles[alert.type]}`}>
      <span className={styles.message}>{alert.message}</span>
      <button
        className={styles.dismiss}
        onClick={() => removeAlert(alert.id)}
        aria-label="Dismiss"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  )
}

export function AlertNotification(): JSX.Element {
  const alerts = useNotificationStore((s) => s.alerts)

  if (alerts.length === 0) return <></>

  return (
    <div className={styles.container}>
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} />
      ))}
    </div>
  )
}