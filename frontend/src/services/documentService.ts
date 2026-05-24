import type { DocumentSummary, DocumentRead, DocumentCreate, DocumentUpdate } from '../types/document'
import { getApiUrl, getHeaders } from './api'
import { API_ROUTES, ERROR_MESSAGES } from '../constants/app'

export const ERROR_MESSAGES_DOCS = {
  FETCH_DOCUMENTS: ERROR_MESSAGES.FETCH_DOCUMENTS,
  CREATE_DOCUMENT: ERROR_MESSAGES.CREATE_DOCUMENT,
  FETCH_DOCUMENT: ERROR_MESSAGES.FETCH_DOCUMENT,
  UPDATE_DOCUMENT: ERROR_MESSAGES.UPDATE_DOCUMENT,
  DELETE_DOCUMENT: ERROR_MESSAGES.DELETE_DOCUMENT,
} as const

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.DOCUMENTOS}`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_DOCS.FETCH_DOCUMENTS)
  return response.json()
}

export async function createDocument(data: DocumentCreate): Promise<DocumentRead> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.DOCUMENTOS}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_DOCS.CREATE_DOCUMENT)
  return response.json()
}

export async function getDocument(id: string): Promise<DocumentRead> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.DOCUMENTOS}/${id}`, {
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_DOCS.FETCH_DOCUMENT)
  return response.json()
}

export async function updateDocument(id: string, data: DocumentUpdate): Promise<DocumentRead> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.DOCUMENTOS}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_DOCS.UPDATE_DOCUMENT)
  return response.json()
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`${getApiUrl()}${API_ROUTES.DOCUMENTOS}/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!response.ok) throw new Error(ERROR_MESSAGES_DOCS.DELETE_DOCUMENT)
}