import { type JSX, useState, useEffect } from 'react'

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content latex-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initialValue ? 'Edit Formula' : 'Insert Formula'}</h3>
          <button className="close-btn" onClick={onClose} title="Close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!initialValue && (
          <div className="latex-tabs">
            <button
              className={`latex-tab ${activeTab === 'inline' ? 'active' : ''}`}
              onClick={() => setActiveTab('inline')}
            >
              <span className="latex-tab-icon">∫</span>
              <span>Inline</span>
              <span className="latex-tab-hint">$ formula $</span>
            </button>
            <button
              className={`latex-tab ${activeTab === 'block' ? 'active' : ''}`}
              onClick={() => setActiveTab('block')}
            >
              <span className="latex-tab-icon">Σ</span>
              <span>Block</span>
              <span className="latex-tab-hint">$$ formula $$</span>
            </button>
          </div>
        )}

        <div className="latex-input-area">
          <textarea
            value={latex}
            onChange={e => setLatex(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeTab === 'inline' ? 'E = mc^2' : '\\sum_{i=1}^{n} x_i'}
            autoFocus
          />
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>
            Cancel
          </button>
          <button className="primary" onClick={handleInsert} disabled={!latex.trim()}>
            {initialValue ? 'Update' : 'Insert'}
          </button>
        </div>
      </div>
    </div>
  )
}