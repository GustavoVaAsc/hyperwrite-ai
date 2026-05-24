import { useState, useCallback } from 'react'
import type { KnowledgeFolder, FolderDetail, KnowledgeListResponse, KnowledgeFile } from '../types/knowledge'
import {
  listKnowledgeFolders,
  getFolderDetail,
  createFolder,
  deleteFolder,
  uploadFile,
  deleteFile,
} from '../services/knowledgeService'

interface UseKnowledgeReturn {
  folders: KnowledgeFolder[]
  currentFolder: FolderDetail | null
  loading: boolean
  error: string | null
  uploadLoading: boolean
  loadFolders: () => Promise<void>
  loadFolderDetail: (folderId: string) => Promise<void>
  createNewFolder: (name: string) => Promise<void>
  removeFolder: (folderId: string) => Promise<void>
  removeFile: (folderId: string, fileId: string) => Promise<void>
  uploadFileToFolder: (folderId: string, file: File) => Promise<void>
  goBack: () => void
}

export function useKnowledge(): UseKnowledgeReturn {
  const [folders, setFolders] = useState<KnowledgeFolder[]>([])
  const [currentFolder, setCurrentFolder] = useState<FolderDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)

  const loadFolders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data: KnowledgeListResponse = await listKnowledgeFolders()
      setFolders(data.folders)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load folders')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFolderDetail = useCallback(async (folderId: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFolderDetail(folderId)
      setCurrentFolder(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load folder')
    } finally {
      setLoading(false)
    }
  }, [])

  const createNewFolder = useCallback(async (name: string) => {
    await createFolder(name)
    await loadFolders()
  }, [loadFolders])

  const removeFolder = useCallback(async (folderId: string) => {
    await deleteFolder(folderId)
    setFolders(prev => prev.filter((f: KnowledgeFolder) => f.id !== folderId))
  }, [])

  const removeFile = useCallback(async (folderId: string, fileId: string) => {
    await deleteFile(fileId)
    setCurrentFolder(prev => {
      if (!prev) return prev
      return {
        ...prev,
        files: prev.files.filter((f: KnowledgeFile) => f.id !== fileId),
        file_count: prev.file_count - 1,
      }
    })
  }, [])

  const uploadFileToFolder = useCallback(async (folderId: string, file: File) => {
    setUploadLoading(true)
    try {
      await uploadFile(folderId, file)
      await loadFolderDetail(folderId)
      await loadFolders()
    } catch (e) {
      throw e instanceof Error ? e : new Error('Failed to upload file')
    } finally {
      setUploadLoading(false)
    }
  }, [loadFolderDetail, loadFolders])

  const goBack = useCallback(() => {
    setCurrentFolder(null)
  }, [])

  return {
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
  }
}