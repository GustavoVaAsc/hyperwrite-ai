import { type JSX, useState, useEffect } from 'react'
import styles from './LaTeXModal.module.css'

type MathMode = 'inline' | 'block'

interface LaTeXModalProps {
  mode?: MathMode
  initialValue?: string
  onInsert: (latex: string, mode: MathMode) => void
  onClose: () => void
}

export function LaTeXModal({
  mode = 'inline',
  initialValue = '',
  onInsert,
  onClose,
}: LaTeXModalProps): JSX.Element {
  const [latex, setLatex] = useState(initialValue)
  const [activeTab, setActiveTab] = useState<MathMode>(mode)

  useEffect(() => {
    setLatex(initialValue)
    setActiveTab(mode)
  }, [initialValue, mode])

  const handleInsert = () => {
    if (latex.trim()) {
      onInsert(latex.trim(), activeTab)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleInsert()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.content} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{initialValue ? 'Edit Formula' : 'Insert Formula'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {!initialValue && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'inline' ? styles.active : ''}`}
              onClick={() => setActiveTab('inline')}
            >
              <span className={styles.tabIcon}>∫</span>
              <span>Inline</span>
              <span className={styles.tabHint}>$ formula $</span>
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'block' ? styles.active : ''}`}
              onClick={() => setActiveTab('block')}
            >
              <span className={styles.tabIcon}>Σ</span>
              <span>Block</span>
              <span className={styles.tabHint}>$$ formula $$</span>
            </button>
          </div>
        )}

        <div className={styles.inputArea}>
          <textarea
            value={latex}
            onChange={e => setLatex(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeTab === 'inline' ? 'E = mc^2' : '\\sum_{i=1}^{n} x_i'}
            autoFocus
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.insertBtn} onClick={handleInsert} disabled={!latex.trim()}>
            {initialValue ? 'Update' : 'Insert'}
          </button>
        </div>
      </div>
    </div>
  )
}