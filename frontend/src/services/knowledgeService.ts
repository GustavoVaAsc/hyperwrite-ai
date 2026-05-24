import type { KnowledgeFolder, FolderDetail, UploadResponse, KnowledgeListResponse, KnowledgeFile } from '../types/knowledge'
import { getApiUrl, getHeaders, getHeadersNoContentType } from './api'
import { API_ROUTES, ERROR_MESSAGES } from '../constants/app'

export const ERROR_MESSAGES_KB = {
  FETCH_FOLDERS: ERROR_MESSAGES.FETCH_FOLDERS,
  FETCH_FOLDER_DETAIL: ERROR_MESSAGES.FETCH_FOLDER_DETAIL,
  CREATE_FOLDER: ERROR_MESSAGES.CREATE_FOLDER,
  DELETE_FOLDER: ERROR_MESSAGES.DELETE_FOLDER,
  UPLOAD_FILE: ERROR_MESSAGES.UPLOAD_FILE,
  FETCH_FILE_RAW: ERROR_MESSAGES.FETCH_FILE_RAW,
  DOWNLOAD_FILE: ERROR_MESSAGES.DOWNLOAD_FILE,
  DELETE_FILE: ERROR_MESSAGES.DELETE_FILE,
} as const

export async function listKnowledgeFolders(): Promise<KnowledgeListResponse> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.KNOWLEDGE}/`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_KB.FETCH_FOLDERS)
  return response.json()
}

export async function getFolderDetail(folderId: string): Promise<FolderDetail> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.KNOWLEDGE_FOLDER}/${folderId}`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_KB.FETCH_FOLDER_DETAIL)
  return response.json()
}

export async function createFolder(name: string): Promise<KnowledgeFolder> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.KNOWLEDGE_FOLDER}`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_KB.CREATE_FOLDER)
  return response.json()
}

export async function deleteFolder(folderId: string): Promise<void> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.KNOWLEDGE_FOLDER}/${folderId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_KB.DELETE_FOLDER)
}

export async function uploadFile(folderId: string, file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${getApiUrl()}${API_ROUTES.KNOWLEDGE_FOLDER}/${folderId}/upload`, {
    method: 'POST',
    headers: getHeadersNoContentType(),
    body: formData,
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_KB.UPLOAD_FILE)
  return response.json()
}

export interface FileRawResponse {
  content: string
  file_type: string
  original_name: string
}

export async function getFileRaw(fileId: string): Promise<FileRawResponse> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.KNOWLEDGE_FILE}/${fileId}/raw`, {
    headers: getHeaders(),
  })
  if (!response.ok) {
    let errorDetail: string = ERROR_MESSAGES_KB.FETCH_FILE_RAW
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
  const response = await fetch(`${getApiUrl()}${API_ROUTES.KNOWLEDGE_FILE}/${fileId}/download`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_KB.DOWNLOAD_FILE)
  return response.blob()
}

export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.KNOWLEDGE_FILE}/${fileId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_KB.DELETE_FILE)
}

export type { KnowledgeFolder, FolderDetail, UploadResponse, KnowledgeListResponse, KnowledgeFile }
