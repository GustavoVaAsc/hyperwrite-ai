import { type JSX } from 'react'
import styles from './ConfirmModal.module.css'

export type ConfirmModalVariant = 'danger' | 'primary'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmModalVariant
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps): JSX.Element {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.content} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>{title}</h3>
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