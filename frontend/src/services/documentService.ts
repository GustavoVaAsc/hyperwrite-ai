import type { DocumentSummary, DocumentRead, DocumentCreate, DocumentUpdate } from '../types/document'
import { useAuthStore } from '../store/authStore'

const getApiUrl = () => import.meta.env.VITE_API_URL

const getHeaders = () => {
  const token = useAuthStore.getState().accessToken
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${getApiUrl()}/api/documentos`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch documents')
  return response.json()
}

export async function createDocument(data: DocumentCreate): Promise<DocumentRead> {
  const response = await fetch(`${getApiUrl()}/api/documentos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create document')
  return response.json()
}

export async function getDocument(id: string): Promise<DocumentRead> {
  const response = await fetch(`${getApiUrl()}/api/documentos/${id}`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch document')
  return response.json()
}

export async function updateDocument(id: string, data: DocumentUpdate): Promise<DocumentRead> {
  const response = await fetch(`${getApiUrl()}/api/documentos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update document')
  return response.json()
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${getApiUrl()}/api/documentos/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error('Failed to delete document')
}