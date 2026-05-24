import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/authStore'
import { listDocuments, createDocument, deleteDocument } from '../services/documentService'
import { useNotificationStore } from '../store/notificationStore'
import { ConfirmModal } from '../components/modals/ConfirmModal'
import { formatDate } from '../utils/formatDate'
import { UI_COPY, ERROR_MESSAGES } from '../constants/app'
import type { DocumentSummary } from '../types/document'
import './Files.css'

function IconFile() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function IconEmpty() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

export function Files() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const addAlert = useNotificationStore((s) => s.addAlert)
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; doc: DocumentSummary | null }>({ show: false, doc: null })

  const loadDocuments = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch {
      setError(ERROR_MESSAGES.FAILED_TO_LOAD_DOCUMENTS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleCreateDocument = async () => {
    try {
      const newDoc = await createDocument({ title: UI_COPY.UNTITLED })
      navigate({ to: '/editor/$docId', params: { docId: newDoc.id } })
    } catch {
      setError(ERROR_MESSAGES.FAILED_TO_CREATE_DOCUMENT)
    }
  }

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const doc = documents.find((d) => d.id === id) || null
    setDeleteConfirm({ show: true, doc })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.doc) return
    try {
      await deleteDocument(deleteConfirm.doc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== deleteConfirm.doc!.id))
    } catch {
      addAlert('error', ERROR_MESSAGES.DELETE_DOCUMENT)
    } finally {
      setDeleteConfirm({ show: false, doc: null })
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, doc: null })
  }

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  const filteredDocuments = documents.filter((doc) => {
    const query = searchQuery.toLowerCase()
    return (
      (doc.title || UI_COPY.UNTITLED).toLowerCase().startsWith(query) ||
      (doc.excerpt || '').toLowerCase().startsWith(query)
    )
  })

  return (
    <div className="files-page">
      <div className="files-grid-bg" />
      <div className="glow glow-purple" />
      <div className="glow glow-cyan" />
      <div className="glow glow-pink" />

      <nav className="files-nav">
        <a href="/files" className="files-logo">
          <span className="files-logo-dot" />
          Hyperwrite AI
        </a>
        <div className="files-nav-links">
          <a href="/files" className="nav-link">Files</a>
          <a href="/knowledge" className="nav-link">Knowledge</a>
          {user && (
            <span className="nav-user">{user.display_name || user.username}</span>
          )}
          <button onClick={handleLogout} className="nav-logout">
            Logout
          </button>
        </div>
      </nav>

      <main className="files-main">
        <div className="files-content">
          <div className="files-header">
            <div className="files-title-wrapper">
              <h1>
                My <span className="files-title-accent">Files</span>
              </h1>
              {!isLoading && (
                <span className="files-count">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? 'document' : 'documents'}
                </span>
              )}
            </div>
            <button onClick={handleCreateDocument} className="btn-primary">
              <IconPlus />
              New Document
            </button>
          </div>

          {documents.length > 0 && (
            <div className="files-search">
              <IconSearch />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          <div className="files-separator" />

          {isLoading && <p className="loading-text">Loading documents...</p>}
          {error && <p className="error-text">{error}</p>}

          {!isLoading && documents.length === 0 && !error && (
            <div className="empty-state">
              <div className="empty-icon">
                <IconEmpty />
              </div>
              <h3>No documents yet</h3>
              <p>Create your first document to get started</p>
            </div>
          )}

          {!isLoading && documents.length > 0 && filteredDocuments.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <IconSearch />
              </div>
              <h3>No matching documents</h3>
              <p>We couldn't find anything matching "{searchQuery}"</p>
            </div>
          )}

          {filteredDocuments.length > 0 && (
            <ul className="files-list">
              {filteredDocuments.map((doc) => (
                <li key={doc.id} className="file-item">
                  <a
                    href={`/editor/${doc.id}`}
                    className="file-link"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate({ to: '/editor/$docId', params: { docId: doc.id } })
                    }}
                  >
                    <div className="file-icon">
                      <IconFile />
                    </div>
                    <div className="file-info">
                      <span className="file-title">{doc.title || 'Untitled'}</span>
                      <span className="file-date">{formatDate(doc.updated_at, true)}</span>
                    </div>
                  </a>
                  <button
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                    className="btn-delete"
                    aria-label="Delete document"
                    title="Delete document"
                  >
                    <IconTrash />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {deleteConfirm.show && deleteConfirm.doc && (
        <ConfirmModal
          title="Delete Document"
          message={`Are you sure you want to delete "${deleteConfirm.doc.title || UI_COPY.UNTITLED}"? ${UI_COPY.DELETE_CONFIRM_SUFFIX}`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}