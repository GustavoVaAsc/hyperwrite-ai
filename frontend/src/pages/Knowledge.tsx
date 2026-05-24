import { type JSX, useState, useEffect } from 'react'
import { useKnowledge } from '../hooks/useKnowledge'
import { FolderItem } from '../components/knowledge/FolderItem'
import { FileItem } from '../components/knowledge/FileItem'
import { FileViewer } from '../components/knowledge/FileViewer'
import { UploadModal } from '../components/knowledge/UploadModal'
import type { KnowledgeFolder, KnowledgeFile } from '../types/knowledge'

interface DeleteConfirmModalProps {
  fileName: string
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmModal({ fileName, onConfirm, onCancel }: DeleteConfirmModalProps): JSX.Element {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-content delete-confirm-modal" onClick={e => e.stopPropagation()}>
        <h3>Delete File</h3>
        <p>Are you sure you want to delete "{fileName}"? This action cannot be undone.</p>
        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export function Knowledge(): JSX.Element {
  const {
    folders,
    currentFolder,
    loading,
    error,
    uploadLoading,
    loadFolders,
    loadFolderDetail,
    createNewFolder,
    removeFolder,
    removeFile,
    uploadFileToFolder,
    goBack,
  } = useKnowledge()

  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [selectedFile, setSelectedFile] = useState<KnowledgeFile | null>(null)
  const [uploadTargetFolder, setUploadTargetFolder] = useState<KnowledgeFolder | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; file: KnowledgeFile | null }>({ show: false, file: null })

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  const handleFolderSelect = (folder: KnowledgeFolder) => {
    loadFolderDetail(folder.id)
  }

  const handleDeleteFolder = async (folderId: string) => {
    await removeFolder(folderId)
  }

  const handleDeleteFileClick = (file: KnowledgeFile) => {
    setDeleteConfirm({ show: true, file })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.file || !currentFolder) return
    try {
      await removeFile(currentFolder.id, deleteConfirm.file.id)
    } catch {
      alert('Failed to delete file')
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
      alert('Failed to create folder')
    }
  }

  const handleUploadClick = (folder: KnowledgeFolder) => {
    setUploadTargetFolder(folder)
  }

  const handleUploadClose = () => {
    setUploadTargetFolder(null)
  }

  const handleFilesUpload = async (folderId: string, files: File[]) => {
    for (const file of files) {
      try {
        await uploadFileToFolder(folderId, file)
      } catch {
        alert(`Failed to upload ${file.name}`)
      }
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowNewFolderModal(false)
      setSelectedFile(null)
    }
  }

  return (
    <div className="page-container knowledge-page">
      <div className="knowledge-header">
        <div className="header-left">
          {currentFolder ? (
            <button className="back-btn" onClick={goBack}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
              <span>Back to Folders</span>
            </button>
          ) : (
            <h1>Knowledge Base</h1>
          )}
        </div>
        <div className="header-right">
          {currentFolder && (
            <button
              className="new-folder-btn"
              onClick={() => setUploadTargetFolder(currentFolder)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
              </svg>
              <span>Upload</span>
            </button>
          )}
          {!currentFolder && (
            <button
              className="new-folder-btn"
              onClick={() => setShowNewFolderModal(true)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              <span>New Folder</span>
            </button>
          )}
        </div>
      </div>

      <div className="knowledge-content">
        {loading && <div className="loading-state">Loading...</div>}
        {error && <div className="error-state">{error}</div>}

        {!loading && !error && !currentFolder && folders.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
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
                <div className="empty-icon">📄</div>
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

      {uploadLoading && (
        <div className="upload-indicator">Uploading...</div>
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
        <DeleteConfirmModal
          fileName={deleteConfirm.file.original_name}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  )
}