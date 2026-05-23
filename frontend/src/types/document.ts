export interface DocumentSummary {
  id: string
  title: string
  updated_at: string
  excerpt: string
}

export interface DocumentRead {
  id: string
  title: string
  content_json: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface DocumentCreate {
  title?: string
  content_json?: Record<string, unknown> | null
}

export interface DocumentUpdate {
  title?: string
  content_json?: Record<string, unknown> | null
}