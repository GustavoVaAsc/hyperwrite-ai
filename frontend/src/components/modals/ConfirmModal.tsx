import { useEffect, type JSX, type ReactNode } from 'react'
import styles from './ConfirmModal.module.css'

export type ConfirmModalVariant = 'danger' | 'primary'

interface ConfirmModalProps {
  title: string
  message: ReactNode
  icon?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmModalVariant
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  icon,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps): JSX.Element {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.content}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className={styles.header}>
          {icon && <div className={styles.icon}>{icon}</div>}
          <h3 id="confirm-modal-title" className={styles.title}>
            {title}
          </h3>
        </div>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button onClick={onCancel}>{cancelLabel}</button>
          <button className={styles[variant]} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}