import { type JSX } from 'react'
import type { KnowledgeFolder } from '../../types/knowledge'

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

interface FolderItemProps {
  folder: KnowledgeFolder
  isSelected: boolean
  onSelect: (folder: KnowledgeFolder) => void
  onDelete: (folderId: string) => Promise<void>
  onUpload: (folder: KnowledgeFolder) => void
}

export function FolderItem({ folder, isSelected, onSelect, onDelete, onUpload }: FolderItemProps): JSX.Element {
  const handleUpload = (e: React.MouseEvent) => {
    e.stopPropagation()
    onUpload(folder)
  }

  return (
    <>
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
            onClick={(e) => {
              e.stopPropagation()
              onDelete(folder.id)
            }}
            title="Delete folder"
          >
            <IconTrash />
          </button>
        </div>
      </div>
    </>
  )
}