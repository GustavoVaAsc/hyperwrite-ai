import type { KnowledgeFolder, FolderDetail, UploadResponse, KnowledgeListResponse, KnowledgeFile } from '../types/knowledge'
import { useAuthStore } from '../store/authStore'

const getApiUrl = () => import.meta.env.VITE_API_URL

const getHeaders = () => {
  const token = useAuthStore.getState().accessToken
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function listKnowledgeFolders(): Promise<KnowledgeListResponse> {
  const response = await fetch(`${getApiUrl()}/knowledge/`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch knowledge folders')
  return response.json()
}

export async function getFolderDetail(folderId: string): Promise<FolderDetail> {
  const response = await fetch(`${getApiUrl()}/knowledge/folder/${folderId}`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch folder detail')
  return response.json()
}

export async function createFolder(name: string): Promise<KnowledgeFolder> {
  const response = await fetch(`${getApiUrl()}/knowledge/folder`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error('Failed to create folder')
  return response.json()
}

export async function deleteFolder(folderId: string): Promise<void> {
  const response = await fetch(`${getApiUrl()}/knowledge/folder/${folderId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('Failed to delete folder')
}

export async function uploadFile(folderId: string, file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${getApiUrl()}/knowledge/folder/${folderId}/upload`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  })
  if (!response.ok) throw new Error('Failed to upload file')
  return response.json()
}

export interface FileRawResponse {
  content: string
  file_type: string
  original_name: string
}

export async function getFileRaw(fileId: string): Promise<FileRawResponse> {
  const response = await fetch(`${getApiUrl()}/knowledge/file/${fileId}/raw`, {
    headers: getHeaders(),
  })
  if (!response.ok) {
    let errorDetail = 'Failed to fetch file raw'
    try {
      const errorData = await response.json()
      errorDetail = errorData.detail || errorDetail
    } catch {
      errorDetail = response.statusText || errorDetail
    }
    throw new Error(errorDetail)
  }
  return response.json()
}

export async function downloadFile(fileId: string): Promise<Blob> {
  const response = await fetch(`${getApiUrl()}/knowledge/file/${fileId}/download`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('Failed to download file')
  return response.blob()
}

export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${getApiUrl()}/knowledge/file/${fileId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('Failed to delete file')
}

export type { KnowledgeFolder, FolderDetail, UploadResponse, KnowledgeListResponse, KnowledgeFile }
