import { type JSX, useState, useRef, useCallback } from 'react'
import type { KnowledgeFolder } from '../../types/knowledge'

interface UploadModalProps {
  folder: KnowledgeFolder | null
  onUpload: (folderId: string, files: File[]) => Promise<void>
  onClose: () => void
}

export function UploadModal({ folder, onUpload, onClose }: UploadModalProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !folder) return
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(fileArray.map(f => f.name))

    try {
      await onUpload(folder.id, fileArray)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload files')
    } finally {
      setIsUploading(false)
      setUploadProgress([])
    }
  }, [folder, onUpload, onClose])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isUploading) onClose()
  }

  if (!folder) return null

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content upload-modal">
        <div className="modal-header">
          <h3>Upload to {folder.name}</h3>
          <button className="close-btn" onClick={onClose} disabled={isUploading}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div
            ref={dropZoneRef}
            className={`upload-drop-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isUploading ? (
              <div className="upload-progress">
                <div className="spinner" />
                <p>Uploading...</p>
                <ul className="upload-file-list">
                  {uploadProgress.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="upload-icon">
                  <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                </svg>
                <p className="upload-hint">Drag and drop files here</p>
                <p className="upload-or">or</p>
                <button className="btn-primary" onClick={handleBrowseClick}>
                  Browse Files
                </button>
                <p className="upload-formats">Supported: PDF, TXT, MD</p>
              </>
            )}
          </div>

          {error && (
            <div className="error-state">{error}</div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.text"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}