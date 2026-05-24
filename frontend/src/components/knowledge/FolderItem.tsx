import { type JSX, useState } from 'react'
import type { KnowledgeFolder } from '../../types/knowledge'
import { deleteFolder } from '../../services/knowledgeService'

interface FolderItemProps {
  folder: KnowledgeFolder
  isSelected: boolean
  onSelect: (folder: KnowledgeFolder) => void
  onDelete: (folderId: string) => void
  onUpload: (folder: KnowledgeFolder) => void
}

export function FolderItem({ folder, isSelected, onSelect, onDelete, onUpload }: FolderItemProps): JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isDeleting) return
    if (!confirm(`Delete folder "${folder.name}" and all its files?`)) return
    setIsDeleting(true)
    try {
      await deleteFolder(folder.id)
      onDelete(folder.id)
    } catch {
      alert('Failed to delete folder')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation()
    onUpload(folder)
  }

  return (
    <div
      className={`folder-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(folder)}
    >
      <div className="folder-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
      </div>
      <div className="folder-info">
        <span className="folder-name">{folder.name}</span>
        <span className="folder-meta">{folder.file_count} files</span>
      </div>
      <div className="folder-actions">
        <button
          className="action-btn upload-btn"
          onClick={handleUpload}
          title="Upload file"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
          </svg>
        </button>
        <button
          className="action-btn delete-btn"
          onClick={handleDelete}
          disabled={isDeleting}
          title="Delete folder"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      </div>
    </div>
  )
}