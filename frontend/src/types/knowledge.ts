export interface KnowledgeFile {
  id: string
  original_name: string
  file_type: string
  chunk_count: number
  created_at: string
}

export interface KnowledgeFolder {
  id: string
  name: string
  file_count: number
  created_at: string
  updated_at: string
}

export interface FolderDetail extends KnowledgeFolder {
  files: KnowledgeFile[]
}

export interface UploadResponse {
  file_id: string
  chunks_created: number
  message: string
}

export interface KnowledgeListResponse {
  folders: KnowledgeFolder[]
}