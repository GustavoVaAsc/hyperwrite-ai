import { type JSX, useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../store/authStore'
import { useKnowledge } from '../hooks/useKnowledge'
import { FolderItem } from '../components/knowledge/FolderItem'
import { FileItem } from '../components/knowledge/FileItem'
import { FileViewer } from '../components/knowledge/FileViewer'
import { UploadModal } from '../components/knowledge/UploadModal'
import { ConfirmModal } from '../components/modals/ConfirmModal'
import { FolderEmptyIcon, FileEmptyIcon } from '../components/knowledge/EmptyIcons'
import { useNotificationStore } from '../store/notificationStore'
import { ERROR_MESSAGES, UI_COPY } from '../constants/app'
import type { KnowledgeFolder, KnowledgeFile } from '../types/knowledge'
import { deleteFolder } from '../services/knowledgeService'
import './Knowledge.css'

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

export function Knowledge(): JSX.Element {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    folders,
    currentFolder,
    loading,
    error,
    uploadLoading,
    loadFolders,
    loadFolderDetail,
    createNewFolder,
    removeFile,
    uploadFileToFolder,
    goBack,
  } = useKnowledge()
  const addAlert = useNotificationStore((s) => s.addAlert)

  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedFile, setSelectedFile] = useState<KnowledgeFile | null>(null)
  const [uploadTargetFolder, setUploadTargetFolder] = useState<KnowledgeFolder | null>(null)
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<{ show: boolean; folder: KnowledgeFolder | null }>({ show: false, folder: null })
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; file: KnowledgeFile | null }>({ show: false, file: null })
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  const handleFolderSelect = useCallback((folder: KnowledgeFolder) => {
    setSearchQuery('')
    loadFolderDetail(folder.id)
  }, [loadFolderDetail])

  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId) || null
    setDeleteFolderConfirm({ show: true, folder })
  }

  const handleConfirmFolderDelete = async () => {
    if (!deleteFolderConfirm.folder) return
    try {
      await deleteFolder(deleteFolderConfirm.folder.id)
      loadFolders()
    } catch {
      addAlert('error', ERROR_MESSAGES.DELETE_FOLDER)
    } finally {
      setDeleteFolderConfirm({ show: false, folder: null })
    }
  }

  const handleCancelFolderDelete = () => {
    setDeleteFolderConfirm({ show: false, folder: null })
  }

  const handleDeleteFileClick = useCallback((file: KnowledgeFile) => {
    setDeleteConfirm({ show: true, file })
  }, [])

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.file || !currentFolder) return
    try {
      await removeFile(currentFolder.id, deleteConfirm.file.id)
    } catch {
      addAlert('error', ERROR_MESSAGES.DELETE_FILE)
    } finally {
      setDeleteConfirm({ show: false, file: null })
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirm({ show: false, file: null })
  }

  const handleGoBack = () => {
    setSearchQuery('')
    goBack()
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      await createNewFolder(newFolderName.trim())
      setShowNewFolderModal(false)
      setNewFolderName('')
    } catch {
      addAlert('error', ERROR_MESSAGES.CREATE_FOLDER)
    }
  }

  const handleUploadClick = useCallback((folder: KnowledgeFolder) => {
    setUploadTargetFolder(folder)
  }, [])

  const handleUploadClose = useCallback(() => {
    setUploadTargetFolder(null)
  }, [])

  const handleFilesUpload = async (folderId: string, files: File[]) => {
    for (const file of files) {
      try {
        await uploadFileToFolder(folderId, file)
      } catch {
        addAlert('error', `${ERROR_MESSAGES.UPLOAD_FILE}: ${file.name}`)
      }
    }
  }

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowNewFolderModal(false)
      setSelectedFile(null)
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  const filteredFolders = folders.filter((folder) => {
    const query = searchQuery.toLowerCase()
    return folder.name.toLowerCase().startsWith(query)
  })

  const filteredFiles = currentFolder ? currentFolder.files.filter((file) => {
    const query = searchQuery.toLowerCase()
    return file.original_name.toLowerCase().startsWith(query)
  }) : []

  return (
    <div className="knowledge-page">
      <div className="knowledge-grid-bg" />
      <div className="glow glow-purple" />
      <div className="glow glow-cyan" />
      <div className="glow glow-pink" />

      <nav className="knowledge-nav">
        <a href="/files" className="knowledge-logo" onClick={(e) => { e.preventDefault(); navigate({ to: '/files' }) }}>
          <span className="knowledge-logo-dot" />
          Hyperwrite AI
        </a>
        <div className="knowledge-nav-links">
          <a href="/files" className="nav-link" onClick={(e) => { e.preventDefault(); navigate({ to: '/files' }) }}>Files</a>
          <a href="/knowledge" className="nav-link" onClick={(e) => { e.preventDefault(); navigate({ to: '/knowledge' }) }}>Knowledge</a>
          {user && (
            <span className="nav-user">{user.display_name || user.username}</span>
          )}
          <button onClick={handleLogout} className="nav-logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      <main className="knowledge-main">
        <div className="knowledge-content">
          <div className="knowledge-header">
            <div className="knowledge-title-wrapper">
              {currentFolder ? (
                <button className="btn-back" onClick={handleGoBack}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                  </svg>
                  {currentFolder.name}
                </button>
              ) : (
                <h1>
                  Knowledge <span className="knowledge-title-accent">Base</span>
                </h1>
              )}
            </div>
            <div className="header-right">
              {currentFolder ? (
                <button className="btn-primary" onClick={() => handleUploadClick(currentFolder)}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                  </svg>
                  Upload Files
                </button>
              ) : (
                <button className="btn-primary" onClick={() => setShowNewFolderModal(true)}>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  New Folder
                </button>
              )}
            </div>
          </div>

          {((!currentFolder && folders.length > 0) || (currentFolder && currentFolder.files.length > 0)) && (
            <div className="knowledge-search">
              <IconSearch />
              <input
                type="text"
                placeholder={currentFolder ? "Search files..." : "Search folders..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          <div className="knowledge-separator" />

          {loading && <div className="loading-state">Loading...</div>}
          {error && <div className="error-state">{error}</div>}

        {!loading && !error && !currentFolder && folders.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <FolderEmptyIcon />
            </div>
            <h3>No folders yet</h3>
            <p>Create a folder to start organizing your knowledge base</p>
          </div>
        )}

        {!loading && !error && !currentFolder && folders.length > 0 && filteredFolders.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <IconSearch />
            </div>
            <h3>No matching folders</h3>
            <p>We couldn't find anything matching "{searchQuery}"</p>
          </div>
        )}

        {!loading && !error && !currentFolder && filteredFolders.length > 0 && (
          <div className="folder-grid">
            {filteredFolders.map(folder => (
              <FolderItem
                key={folder.id}
                folder={folder}
                isSelected={false}
                onSelect={handleFolderSelect}
                onDelete={handleDeleteFolder}
                onUpload={handleUploadClick}
              />
            ))}
          </div>
        )}

        {!loading && !error && currentFolder && (
          <div className="file-list">
            {currentFolder.files.length === 0 && filteredFiles.length === 0 && !searchQuery ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <FileEmptyIcon />
                </div>
                <h3>No files in this folder</h3>
                <p>Click upload to add files</p>
              </div>
            ) : filteredFiles.length === 0 && searchQuery ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <IconSearch />
                </div>
                <h3>No matching files</h3>
                <p>We couldn't find anything matching "{searchQuery}"</p>
              </div>
            ) : (
              filteredFiles.map(file => (
                <FileItem
                  key={file.id}
                  file={file}
                  onView={setSelectedFile}
                  onDelete={handleDeleteFileClick}
                />
              ))
            )}
          </div>
        )}
        </div>
      </main>

      {uploadLoading && (
        <div className="upload-indicator">{UI_COPY.UPLOADING}</div>
      )}

      {showNewFolderModal && (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
          <div className="modal-content new-folder-modal">
            <h3>Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewFolderModal(false)}>Cancel</button>
              <button className="primary" onClick={handleCreateFolder}>Create</button>
            </div>
          </div>
        </div>
      )}

      {selectedFile && (
        <FileViewer
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}

      {uploadTargetFolder && (
        <UploadModal
          folder={uploadTargetFolder}
          onUpload={handleFilesUpload}
          onClose={handleUploadClose}
        />
      )}

      {deleteFolderConfirm.show && deleteFolderConfirm.folder && (
        <ConfirmModal
          title="Delete Folder"
          icon={<IconTrash />}
          message={
            <>
              Are you sure you want to delete{' '}
              <span className="doc-name-pill">
                {deleteFolderConfirm.folder.name}
              </span>
              ? This action cannot be undone.
            </>
          }
          onConfirm={handleConfirmFolderDelete}
          onCancel={handleCancelFolderDelete}
        />
      )}

      {deleteConfirm.show && deleteConfirm.file && (
        <ConfirmModal
          title="Delete File"
          icon={<IconTrash />}
          message={
            <>
              Are you sure you want to delete{' '}
              <span className="doc-name-pill">
                {deleteConfirm.file.original_name}
              </span>
              ? This action cannot be undone.
            </>
          }
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}