import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import * as TableExtensions from '@tiptap/extension-table'
import * as TableRowExtensions from '@tiptap/extension-table-row'
import * as TableCellExtensions from '@tiptap/extension-table-cell'
import * as TableHeaderExtensions from '@tiptap/extension-table-header'
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import { ResizableImage } from '../extensions/resizableImage'
import { SearchReplace } from '../extensions/searchReplace'
import { FindReplace } from '../components/FindReplace'
import { getDocument, updateDocument, uploadImage } from '../services/documentService'
import { getApiUrl } from '../services/api'
import { LaTeXModal } from '../components/modals/LaTeXModal'
import { useAuthStore } from '../store/authStore'
import { ERROR_MESSAGES } from '../constants/app'
import type { DocumentRead } from '../types/document'
import './Editor.css'
import styles from './Editor.module.css'
import { EditorChatPanel } from '../components/chat/EditorChatPanel'

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
  const { user, logout } = useAuthStore()
  const [document, setDocument] = useState<DocumentRead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [latexModalOpen, setLatexModalOpen] = useState(false)
  const [editingMath, setEditingMath] = useState<{ latex: string; pos: number; mode: 'inline' | 'block' } | null>(null)
  const [showFindReplace, setShowFindReplace] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const isExternalUpdateRef = useRef(false)
  const [, forceUpdate] = useState(0)
  const [outline, setOutline] = useState<{ text: string; level: number; pos: number; id: string }[]>([])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TableExtensions.Table.configure({
        resizable: true,
      }),
      TableRowExtensions.TableRow,
      TableCellExtensions.TableCell,
      TableHeaderExtensions.TableHeader,
      InlineMath.configure({
        onClick: (_node, pos) => {
          if (!editor) return
          const view = editor.view
          const node = view.state.doc.nodeAt(pos)
          if (node?.attrs.latex) {
            setEditingMath({ latex: node.attrs.latex, pos, mode: 'inline' })
          }
        },
      }),
      BlockMath.configure({
        onClick: (_node, pos) => {
          if (!editor) return
          const view = editor.view
          const node = view.state.doc.nodeAt(pos)
          if (node?.attrs.latex) {
            setEditingMath({ latex: node.attrs.latex, pos, mode: 'block' })
          }
        },
      }),
      ResizableImage.configure({
        allowBase64: true,
        inline: false,
      }),
      SearchReplace,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: `tiptap-editor-content ${styles.tiptapEditor}`,
      },
    },
  })

useEffect(() => {
    if (!editor) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        const { state } = editor
        const { selection } = state

        if (selection.empty && editor.isActive('table')) {
          const { $from } = selection
          const isInCellContent = $from.node(1)?.type.name === 'tableCell' || $from.node(1)?.type.name === 'tableHeader'
          const isAtStartOfCell = $from.parentOffset === 0
          
          if (isInCellContent && isAtStartOfCell) {
            event.preventDefault()
            editor.chain().focus().deleteTable().run()
          }
        }
      }
    }

    const dom = editor.view.dom
    dom.addEventListener('keydown', handleKeyDown)
    return () => dom.removeEventListener('keydown', handleKeyDown)
  }, [editor])

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

  const handleTitleChange = (title: string) => {
    if (!docId || !document) return
    setDocument(prev => prev ? { ...prev, title } : prev)
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current)
    }
    titleTimeoutRef.current = setTimeout(async () => {
      try {
        await updateDocument(docId, { title })
      } catch {
        setError(ERROR_MESSAGES.FAILED_TO_UPDATE_TITLE)
      }
    }, 500)
  }

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor || !docId) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Image exceeds 5MB limit')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('File is not an image')
      return
    }
    try {
      const { url } = await uploadImage(docId, file)
      const src = `${getApiUrl()}${url}`
      editor.chain().focus().setImage({ src }).run()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to upload image')
    }
  }, [editor, docId])

  const handleContentChangeRef = useRef(() => {
    if (!editor || !docId || isExternalUpdateRef.current) return
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveDocument(editor.getJSON())
    }, 1000)
  })

  useEffect(() => {
    handleContentChangeRef.current = () => {
      if (!editor || !docId || isExternalUpdateRef.current) return
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(editor.getJSON())
      }, 1000)
    }
  }, [editor, docId, saveDocument])

  const handleDocumentUpdated = useCallback((content: Record<string, unknown>) => {
    if (!editor) return
    isExternalUpdateRef.current = true
    editor.commands.setContent(content)
    setTimeout(() => { isExternalUpdateRef.current = false }, 50)
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const updateOutline = () => {
      const items: { text: string; level: number; pos: number; id: string }[] = []
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          items.push({
            text: node.textContent,
            level: node.attrs.level,
            pos,
            id: `heading-${pos}`,
          })
        }
      })
      setOutline(items)
    }

    updateOutline()

    const handler = () => {
      handleContentChangeRef.current()
    }
    const transactionHandler = () => {
      forceUpdate((n) => n + 1)
      updateOutline()
    }

    editor.on('update', handler)
    editor.on('transaction', transactionHandler)
    return () => {
      editor.off('update', handler)
      editor.off('transaction', transactionHandler)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current)
      }
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) handleImageUpload(file)
          return
        }
      }
    }

    const handleDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files
      if (!files) return
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          event.preventDefault()
          handleImageUpload(file)
          return
        }
      }
    }

    const dom = editor.view.dom
    dom.addEventListener('paste', handlePaste)
    dom.addEventListener('drop', handleDrop)
    return () => {
      dom.removeEventListener('paste', handlePaste)
      dom.removeEventListener('drop', handleDrop)
    }
  }, [editor, handleImageUpload])

  useEffect(() => {
    const handleCtrlF = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setShowFindReplace(true)
      }
    }
    window.addEventListener('keydown', handleCtrlF)
    return () => window.removeEventListener('keydown', handleCtrlF)
  }, [])

  const scrollToHeading = (pos: number) => {
    if (!editor) return
    editor.chain().focus().setTextSelection(pos).scrollIntoView().run()
  }

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  if (isLoading) {
    return (
      <div className="editor-page">
        <div className="editor-grid-bg" />
        <div className="editor-loading">Loading document...</div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="editor-page">
        <div className="editor-grid-bg" />
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
    <div className="editor-page">
      <div className="editor-grid-bg" />
      <div className="glow glow-purple" />
      <div className="glow glow-cyan" />
      <div className="glow glow-pink" />

      <header className="editor-header">
        <div className="editor-header-left">
          <a
            href="/files"
            className="files-logo"
            onClick={(e) => {
              e.preventDefault()
              navigate({ to: '/files' })
            }}
          >
            <span className="files-logo-dot" />
            Hyperwrite AI
          </a>
          <span className={`save-status ${isSaving ? 'saving' : ''}`}>
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
        </div>

        <div className="editor-header-center">
          <input
            type="text"
            className="doc-title-input"
            value={document.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
          />
        </div>

        <div className="files-nav-links">
          <a href="/files" className="nav-link" onClick={(e) => { e.preventDefault(); navigate({ to: '/files' }) }}>
            Files
          </a>
          <a href="/knowledge" className="nav-link" onClick={(e) => { e.preventDefault(); navigate({ to: '/knowledge' }) }}>
            Knowledge
          </a>
          {user && <span className="nav-user">{user.display_name || user.username}</span>}
          <button onClick={handleLogout} className="nav-logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
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
            isActive={
              editor.isActive({ textAlign: 'left' }) ||
              (!editor.isActive({ textAlign: 'center' }) &&
               !editor.isActive({ textAlign: 'right' }) &&
               !editor.isActive({ textAlign: 'justify' }))
            }
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

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            title="Insert 3×3 Table"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <rect x="3" y="5" width="4" height="4" rx="1" opacity="0.8"/>
              <rect x="10" y="5" width="4" height="4" rx="1" opacity="0.8"/>
              <rect x="17" y="5" width="4" height="4" rx="1" opacity="0.8"/>
              <rect x="3" y="12" width="4" height="4" rx="1"/>
              <rect x="10" y="12" width="4" height="4" rx="1"/>
              <rect x="17" y="12" width="4" height="4" rx="1"/>
              <rect x="3" y="19" width="4" height="2" rx="0.5" opacity="0.5"/>
              <rect x="10" y="19" width="4" height="2" rx="0.5" opacity="0.5"/>
              <rect x="17" y="19" width="4" height="2" rx="0.5" opacity="0.5"/>
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            isActive={editor.isActive('table')}
            title="Add Column Left"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M4 4h4v16H4z"/>
              <path d="M10 4h4v16h-4z" opacity="0.5"/>
              <path d="M16 4l4 4-4 4z"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            isActive={editor.isActive('table')}
            title="Add Column Right"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M20 4h-4v16h4z" opacity="0.5"/>
              <path d="M14 4h4v16h-4z"/>
              <path d="M8 4l-4 4 4 4z"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            isActive={editor.isActive('table')}
            title="Delete Column"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M10 4H4v16h6z" opacity="0.5"/>
              <path d="M14 4h6v16h-6z"/>
              <path d="M12 4l-4 4 4 4z" opacity="0.3"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowBefore().run()}
            isActive={editor.isActive('table')}
            title="Add Row Above"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M4 4h16v4H4z" opacity="0.5"/>
              <path d="M4 10h16v4H4z"/>
              <path d="M4 16l4-4 4 4z" opacity="0.3"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            isActive={editor.isActive('table')}
            title="Add Row Below"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M4 14h16v4H4z" opacity="0.5"/>
              <path d="M4 4h16v4H4z"/>
              <path d="M4 20l4-4 4 4z" opacity="0.3"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            isActive={editor.isActive('table')}
            title="Delete Row"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M4 10h16v4H4z"/>
              <path d="M4 4h16v4H4z" opacity="0.5"/>
              <path d="M4 16l4-4 4 4z" opacity="0.3"/>
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().deleteTable().run()}
            isActive={editor.isActive('table')}
            title="Delete Table"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M4 4h16v16H4z" fill="none"/>
              <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={() => setLatexModalOpen(true)}
            title="Insert Formula"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <text x="4" y="18" fontSize="16" fontWeight="bold" fontFamily="serif">∑</text>
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => {
              const prevTitle = window.document.title
              window.document.title = document?.title || 'Document'
              window.print()
              window.document.title = prevTitle
            }}
            title="Export PDF (Ctrl+P)"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M6 2h12v4H6z" opacity="0.5"/>
              <path d="M4 8h16v8H4z"/>
              <rect x="6" y="14" width="12" height="8" fill="white" rx="1"/>
              <path d="M8 17h8M8 20h5" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => imageInputRef.current?.click()}
            title="Insert Image"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="8.5" cy="9.5" r="2" />
              <path d="M3 16l5-5 4 4 3-3 6 6v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-3z" />
            </svg>
          </ToolbarButton>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImageUpload(file)
              e.target.value = ''
            }}
          />
        </div>
      )}
      {showFindReplace && editor && (
        <FindReplace editor={editor} onClose={() => setShowFindReplace(false)} />
      )}
      <div className="editor-main-layout">
        <aside className="editor-sidebar-left">
          <h2 className="outline-header">Outline</h2>
          <div className="outline-list">
            {outline.length === 0 ? (
              <p className="outline-empty">No headings yet.</p>
            ) : (
              outline.map((item) => (
                <button
                  key={item.id}
                  className="outline-item"
                  style={{ paddingLeft: `${(item.level - 1) * 16 + 12}px` }}
                  onClick={() => scrollToHeading(item.pos)}
                >
                  <span className="outline-level">H{item.level}</span>
                  <span className="outline-text">{item.text || 'Empty heading'}</span>
                </button>
              ))
            )}
          </div>
        </aside>
        <main className="editor-content-area">
          <EditorContent editor={editor} />
        </main>
        <EditorChatPanel docId={docId} onDocumentUpdated={handleDocumentUpdated} />
      </div>

      {editor && (() => {
        const text = editor.state.doc.textContent
        const words = text.trim() ? text.trim().split(/\s+/).length : 0
        const chars = text.length
        const readingTime = Math.max(1, Math.ceil(words / 200))
        return (
          <footer className="editor-status-bar">
            <span>{words} {words === 1 ? 'word' : 'words'}</span>
            <span>{chars} {chars === 1 ? 'character' : 'characters'}</span>
            <span>~{readingTime} min read</span>
          </footer>
        )
      })()}

      {(latexModalOpen || editingMath) && (
        <LaTeXModal
          mode={editingMath?.mode || 'inline'}
          initialValue={editingMath?.latex || ''}
          onInsert={(latex, mathMode) => {
            if (editingMath) {
              if (editingMath.mode === 'inline') {
                editor.chain().focus().updateInlineMath({ latex, pos: editingMath.pos }).run()
              } else {
                editor.chain().focus().updateBlockMath({ latex, pos: editingMath.pos }).run()
              }
              setEditingMath(null)
            } else {
              if (mathMode === 'inline') {
                editor.chain().focus().insertInlineMath({ latex }).run()
              } else {
                editor.chain().focus().insertBlockMath({ latex }).run()
              }
              setLatexModalOpen(false)
            }
          }}
          onClose={() => {
            setLatexModalOpen(false)
            setEditingMath(null)
          }}
        />
      )}
    </div>
  )
}