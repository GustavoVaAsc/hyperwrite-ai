import { type JSX, useState, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { getFileRaw, downloadFile } from '../../services/knowledgeService'
import type { KnowledgeFile } from '../../types/knowledge'

interface FileViewerProps {
  file: KnowledgeFile | null
  onClose: () => void
}

export function FileViewer({ file, onClose }: FileViewerProps): JSX.Element {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFile = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setPdfUrl(null)
    setTextContent('')

    try {
      if (file.file_type === 'pdf') {
        const blob = await downloadFile(file.id)
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      } else {
        const data = await getFileRaw(file.id)
        setTextContent(data.content)
      }
    } catch {
      setError('Failed to load file content')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!file) return
    loadFile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [pdfUrl])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content file-viewer-modal">
        <div className="modal-header">
          <h3>{file?.original_name}</h3>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <div className="modal-body file-viewer-body">
          {loading && <div className="loading-state">Loading...</div>}
          {error && <div className="error-state">{error}</div>}
          {!loading && !error && pdfUrl && (
            <iframe
              src={pdfUrl}
              className="pdf-viewer"
              title={file?.original_name}
            />
          )}
          {!loading && !error && textContent && (
            <pre className="file-content">{DOMPurify.sanitize(textContent)}</pre>
          )}
        </div>
      </div>
    </div>
  )
}