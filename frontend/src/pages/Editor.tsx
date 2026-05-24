import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { getDocument, updateDocument } from '../services/documentService'
import { ERROR_MESSAGES } from '../constants/app'
import type { DocumentRead } from '../types/document'
import { ThemeToggle } from '../components/ThemeToggle'
import styles from './Editor.module.css'

function ToolbarButton({
  onClick,
  isActive = false,
  title,
  children,
}: {
  onClick: () => void
  isActive?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
      title={title}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <span className="toolbar-divider" />
}

export function Editor() {
  const { docId } = useParams({ from: '/editor/$docId' })
  const navigate = useNavigate()
  const [document, setDocument] = useState<DocumentRead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, forceUpdate] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: `tiptap-editor-content ${styles.tiptapEditor}`,
      },
    },
  })

  const saveDocument = useCallback(
    async (content: Record<string, unknown>) => {
      if (!docId) return
      setIsSaving(true)
      try {
        const updated = await updateDocument(docId, { content_json: content })
        setDocument(updated)
      } catch {
        setError(ERROR_MESSAGES.FAILED_TO_SAVE)
      } finally {
        setIsSaving(false)
      }
    },
    [docId]
  )

  useEffect(() => {
    if (!docId) {
      setError(ERROR_MESSAGES.NO_DOCUMENT_SELECTED)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')

    let isMounted = true

    getDocument(docId)
      .then((doc) => {
        if (isMounted) {
          setDocument(doc)
          editor?.commands.setContent(doc.content_json || { type: 'doc', content: [] })
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(ERROR_MESSAGES.FAILED_TO_LOAD_DOCUMENT)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [docId, editor])

  const handleTitleChange = async (title: string) => {
    if (!docId || !document) return
    try {
      const updated = await updateDocument(docId, { title })
      setDocument(updated)
    } catch {
      setError(ERROR_MESSAGES.FAILED_TO_UPDATE_TITLE)
    }
  }

  const handleContentChangeRef = useRef(() => {
    if (!editor || !docId) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDocument(editor.getJSON())
    }, 1000)
  })

  useEffect(() => {
    handleContentChangeRef.current = () => {
      if (!editor || !docId) return
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(editor.getJSON())
      }, 1000)
    }
  }, [editor, docId, saveDocument])

  useEffect(() => {
    if (!editor) return

    const handler = () => handleContentChangeRef.current()
    const transactionHandler = () => forceUpdate((n) => n + 1)

    editor.on('update', handler)
    editor.on('transaction', transactionHandler)
    return () => {
      editor.off('update', handler)
      editor.off('transaction', transactionHandler)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [editor])

  if (isLoading) {
    return (
      <div className="editor-fullscreen">
        <div className="editor-loading">Loading document...</div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="editor-fullscreen">
        <div className="editor-error">
          <p>{error || 'Document not found'}</p>
          <button onClick={() => navigate({ to: '/files' })} className="btn-primary">
            Back to Files
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-fullscreen">
      <header className="editor-header">
        <button onClick={() => navigate({ to: '/files' })} className="btn-back">
          ← Files
        </button>
        <input
          type="text"
          className="doc-title-input"
          value={document.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
        />
        <span className={`save-status ${isSaving ? 'saving' : ''}`}>
          {isSaving ? 'Saving...' : 'Saved'}
        </span>
        <ThemeToggle />
      </header>
      {editor && (
        <div className="editor-toolbar">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Code"
          >
            {'</>'}
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            isActive={editor.isActive('heading', { level: 4 })}
            title="Heading 4"
          >
            H4
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            •≡
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Ordered List"
          >
            1.
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            ≡L
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            ≡C
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            ≡R
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
          >
            ≡J
          </ToolbarButton>
        </div>
      )}
      <main className="editor-content-area">
        <EditorContent editor={editor} />
      </main>
    </div>
  )
}