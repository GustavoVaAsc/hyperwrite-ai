export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FILES: '/files',
  EDITOR: '/editor',
  KNOWLEDGE: '/knowledge',
} as const

export const API_ROUTES = {
  DOCUMENTOS: '/api/documentos',
  KNOWLEDGE: '/knowledge',
  KNOWLEDGE_FOLDER: '/knowledge/folder',
  KNOWLEDGE_FILE: '/knowledge/file',
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  USERS_ME: '/users/me',
} as const

export const ERROR_MESSAGES = {
  FETCH_USER: 'Failed to fetch user data',
  FETCH_DOCUMENTS: 'Failed to fetch documents',
  CREATE_DOCUMENT: 'Failed to create document',
  FETCH_DOCUMENT: 'Failed to fetch document',
  UPDATE_DOCUMENT: 'Failed to update document',
  DELETE_DOCUMENT: 'Failed to delete document',
  FETCH_FOLDERS: 'Failed to fetch knowledge folders',
  FETCH_FOLDER_DETAIL: 'Failed to fetch folder detail',
  CREATE_FOLDER: 'Failed to create folder',
  DELETE_FOLDER: 'Failed to delete folder',
  UPLOAD_FILE: 'Failed to upload file',
  FETCH_FILE_RAW: 'Failed to fetch file content',
  DOWNLOAD_FILE: 'Failed to download file',
  DELETE_FILE: 'Failed to delete file',
  FAILED_TO_SAVE: 'Failed to save',
  FAILED_TO_LOAD_DOCUMENT: 'Failed to load document',
  FAILED_TO_UPDATE_TITLE: 'Failed to update title',
  FAILED_TO_LOAD_FILE_CONTENT: 'Failed to load file content',
  FAILED_TO_LOAD_DOCUMENTS: 'Failed to load documents',
  FAILED_TO_CREATE_DOCUMENT: 'Failed to create document',
  NO_DOCUMENT_SELECTED: 'No document selected',
  BACKEND_CONNECTION: 'Error: could not connect to backend',
  CONNECTING: 'Connecting...',
} as const

export const UI_COPY = {
  UNTITLED: 'Untitled',
  BACK_TO_FOLDERS: 'Back to Folders',
  DELETE_CONFIRM_SUFFIX: 'This action cannot be undone.',
  CREATING: 'Creating...',
  UPLOADING: 'Uploading...',
  SAVING: 'Saving...',
  SAVED: 'Saved',
  LOADING: 'Loading...',
} as const

export const FILE_EXTENSIONS = {
  SUPPORTED: '.pdf,.txt,.md,.text',
  TYPES: ['pdf', 'txt', 'md', 'text'] as const,
} as const

export const TIMING = {
  NOTIFICATION_DURATION_MS: 10000,
} as const