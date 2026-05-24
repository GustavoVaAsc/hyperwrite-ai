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
    setFolders,
  } = useKnowledge()
  const addAlert = useNotificationStore((s) => s.addAlert)

  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedFile, setSelectedFile] = useState<KnowledgeFile | null>(null)
  const [uploadTargetFolder, setUploadTargetFolder] = useState<KnowledgeFolder | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; file: KnowledgeFile | null }>({ show: false, file: null })

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  const handleFolderSelect = useCallback((folder: KnowledgeFolder) => {
    loadFolderDetail(folder.id)
  }, [loadFolderDetail])

  const handleDeleteFolder = async (folderId: string) => {
    const originalFolders = folders
    setFolders((prev) => prev.filter((f) => f.id !== folderId))
    try {
      await deleteFolder(folderId)
    } catch {
      setFolders(originalFolders)
      addAlert('error', ERROR_MESSAGES.DELETE_FOLDER)
    }
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
          <a href="/knowledge" className="nav-link nav-link--active" onClick={(e) => { e.preventDefault(); navigate({ to: '/knowledge' }) }}>Knowledge</a>
          {user && (
            <span className="nav-user">{user.display_name || user.username}</span>
          )}
          <button onClick={handleLogout} className="nav-logout">
            Logout
          </button>
        </div>
      </nav>

      <main className="knowledge-main">
        <div className="knowledge-content">
          <div className="knowledge-header">
            <div className="knowledge-title-wrapper">
              {currentFolder ? (
                <button className="btn-back" onClick={goBack}>
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

          {loading && <div className="loading-state">Loading...</div>}
          {error && <div className="error-state">{error}</div>}

        {!loading && !error && !currentFolder && folders.length === 0 && (
          <div className="empty-state">
            <FolderEmptyIcon className="empty-icon" />
            <h3>No folders yet</h3>
            <p>Create a folder to start organizing your knowledge base</p>
          </div>
        )}

        {!loading && !error && !currentFolder && folders.length > 0 && (
          <div className="folder-grid">
            {folders.map(folder => (
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
            {currentFolder.files.length === 0 ? (
              <div className="empty-state">
                <FileEmptyIcon className="empty-icon" />
                <h3>No files in this folder</h3>
                <p>Click upload to add files</p>
              </div>
            ) : (
              currentFolder.files.map(file => (
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

      {deleteConfirm.show && deleteConfirm.file && (
        <ConfirmModal
          title="Delete File"
          message={`Are you sure you want to delete "${deleteConfirm.file.original_name}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}