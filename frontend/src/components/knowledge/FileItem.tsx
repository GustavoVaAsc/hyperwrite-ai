import { type JSX, useState } from 'react'
import type { KnowledgeFile } from '../../types/knowledge'

interface FileItemProps {
  file: KnowledgeFile
  onView: (file: KnowledgeFile) => void
  onDelete: (file: KnowledgeFile) => void
}

const FILE_ICONS: Record<string, JSX.Element> = {
  pdf: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z" />
    </svg>
  ),
  txt: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
    </svg>
  ),
  md: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
    </svg>
  ),
  text: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
    </svg>
  ),
}

export function FileItem({ file, onView, onDelete }: FileItemProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false)

  const icon = FILE_ICONS[file.file_type] || FILE_ICONS.text

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(file)
  }

  return (
    <div
      className="file-item"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView(file)}
    >
      <div className={`file-icon ${file.file_type}`}>{icon}</div>
      <div className="file-info">
        <span className="file-name">{file.original_name}</span>
        <span className="file-meta">
          {formatDate(file.created_at)} · {file.chunk_count} chunks
        </span>
      </div>
      <div className={`file-actions ${isHovered ? 'visible' : ''}`}>
        <button className="action-btn view-btn" title="View file">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
        </button>
        <button
          className="action-btn delete-btn"
          title="Delete file"
          onClick={handleDelete}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      </div>
    </div>
  )
}