import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { listDocuments, createDocument, deleteDocument } from '../services/documentService'
import type { DocumentSummary } from '../types/document'

export function Files() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDocuments = async () => {
    setIsLoading(true)
    setError('')
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch {
      setError('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments()
  }, [])

  const handleCreateDocument = async () => {
    try {
      const newDoc = await createDocument({ title: 'Untitled' })
      navigate({ to: '/editor/$docId', params: { docId: newDoc.id } })
    } catch {
      setError('Failed to create document')
    }
  }

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this document?')) return
    try {
      await deleteDocument(id)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
    } catch {
      setError('Failed to delete document')
    }
  }

  return (
    <div className="page-container">
      <div className="files-header">
        <h1>My Files</h1>
        <button onClick={handleCreateDocument} className="btn-primary">
          + New Document
        </button>
      </div>

      {isLoading && <p className="loading-text">Loading documents...</p>}
      {error && <p className="error-text">{error}</p>}

      {!isLoading && documents.length === 0 && !error && (
        <div className="empty-state">
          <p>No documents yet.</p>
          <p>Create your first document to get started.</p>
          <button onClick={handleCreateDocument} className="btn-primary">
            + New Document
          </button>
        </div>
      )}

      {documents.length > 0 && (
        <ul className="files-list">
          {documents.map((doc) => (
            <li key={doc.id} className="file-item">
              <a
                href={`/editor/${doc.id}`}
                className="file-link"
                onClick={(e) => {
                  e.preventDefault()
                  navigate({ to: '/editor/$docId', params: { docId: doc.id } })
                }}
              >
                <div className="file-icon">📄</div>
                <div className="file-info">
                  <span className="file-title">{doc.title || 'Untitled'}</span>
                  <span className="file-date">
                    {new Date(doc.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {doc.excerpt && <p className="file-excerpt">{doc.excerpt}</p>}
                </div>
                <button
                  onClick={(e) => handleDeleteDocument(doc.id, e)}
                  className="btn-delete"
                  aria-label="Delete document"
                >
                  ×
                </button>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}