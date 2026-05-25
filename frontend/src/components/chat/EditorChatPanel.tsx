import { useState, useRef, useEffect, useCallback } from 'react'
import './EditorChatPanel.css'

type Agent = {
  id: string
  name: string
  description: string
  color: string
}

const AGENTS: Agent[] = [
  {
    id: 'cientifico',
    name: 'Scientist',
    description: 'Specialist in academic and technical texts.',
    color: 'var(--cyan)',
  },
  {
    id: 'narrativo',
    name: 'Narrative',
    description: 'Creative writing and storytelling assistant.',
    color: 'var(--purple)',
  },
  {
    id: 'legal',
    name: 'Legal',
    description: 'Legal drafting assistant.',
    color: 'var(--pink)',
  },
]

type Attachment = { id: string; name: string }
type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: Attachment[]
}

type ChatSession = {
  id: string
  title: string
  agentId: string
  messages: Message[]
  updatedAt: number
}

let attachmentCounter = 0

function buildGreeting(agent: Agent): Message {
  return {
    id: `greeting-${agent.id}-${Date.now()}`,
    role: 'assistant',
    content: `Hi — I'm ${agent.name}. Share a prompt or attach a file and I'll help.`,
  }
}

export function EditorChatPanel() {
  const [sessions, setSessions] = useState<ChatSession[]>([{
    id: `sess-${Date.now()}`,
    title: 'New Chat',
    agentId: AGENTS[0].id,
    messages: [buildGreeting(AGENTS[0])],
    updatedAt: Date.now()
  }])
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id)
  const [view, setView] = useState<'chat' | 'history'>('chat')

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const [agentMenuOpen, setAgentMenuOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([])

  const agentMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0]
  const agentId = activeSession.agentId
  const messages = activeSession.messages
  const agent = AGENTS.find((a) => a.id === agentId) ?? AGENTS[0]

  const updateActiveSession = useCallback((updates: Partial<ChatSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, ...updates, updatedAt: Date.now() } : s))
    )
  }, [activeSessionId])

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('.editor-header') as HTMLElement | null
      const toolbar = document.querySelector('.editor-toolbar') as HTMLElement | null
      const total = (header?.offsetHeight ?? 0) + (toolbar?.offsetHeight ?? 0)
      document.documentElement.style.setProperty('--editor-chrome-height', `${total}px`)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  useEffect(() => {
    if (!agentMenuOpen) return
    const onClick = (e: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target as Node)) {
        setAgentMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAgentMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [agentMenuOpen])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }, [draft])

  const handleSend = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed && pendingFiles.length === 0) return
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: trimmed,
      attachments: pendingFiles.length > 0 ? pendingFiles : undefined,
    }
    
    let newTitle = activeSession.title
    if (activeSession.messages.length <= 1 && trimmed) {
      newTitle = trimmed.slice(0, 25) + (trimmed.length > 25 ? '...' : '')
    }

    updateActiveSession({
      title: newTitle,
      messages: [...activeSession.messages, userMsg],
    })
    setDraft('')
    setPendingFiles([])
  }, [draft, pendingFiles, activeSession, updateActiveSession])

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `sess-${Date.now()}`,
      title: 'New Chat',
      agentId: AGENTS[0].id,
      messages: [buildGreeting(AGENTS[0])],
      updatedAt: Date.now(),
    }
    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setView('chat')
    setDraft('')
    setPendingFiles([])
  }

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      if (filtered.length === 0) {
        handleNewChat()
        return prev
      }
      if (activeSessionId === id) setActiveSessionId(filtered[0].id)
      return filtered
    })
  }

  const handleStartRename = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation()
    setEditingSessionId(session.id)
    setEditingTitle(session.title)
  }

  const handleSaveRename = () => {
    if (editingSessionId && editingTitle.trim()) {
      updateActiveSession({ title: editingTitle.trim() })
      setSessions((prev) => prev.map((s) => (s.id === editingSessionId ? { ...s, title: editingTitle.trim() } : s)))
    }
    setEditingSessionId(null)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSaveRename()
    if (e.key === 'Escape') setEditingSessionId(null)
  }

  const handleAgentSelect = (id: string) => {
    setAgentMenuOpen(false)
    if (id === agentId) return
    const next = AGENTS.find((a) => a.id === id)
    if (!next) return
    updateActiveSession({
      agentId: id,
      messages: [
        ...activeSession.messages,
        {
          id: `switch-${Date.now()}`,
          role: 'system',
          content: `Switched to ${next.name}. ${next.description}`,
        },
      ],
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const newAttachments: Attachment[] = files.map((f) => ({
      id: `att-${++attachmentCounter}`,
      name: f.name,
    }))
    setPendingFiles((prev) => [...prev, ...newAttachments])
    e.target.value = ''
  }

  const removeFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = draft.trim().length > 0 || pendingFiles.length > 0

  if (view === 'history') {
    return (
      <aside className="editor-chat-panel" aria-label="AI assistant history">
        <div className="chat-panel-accent-line" aria-hidden="true" />
        <header className="chat-history-header">
          <button
            type="button"
            className="chat-panel-icon-btn"
            onClick={() => setView('chat')}
            title="Back to chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="chat-history-header-title">Chat History</span>
          <button
            type="button"
            className="chat-panel-icon-btn"
            onClick={handleNewChat}
            title="New chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </header>
        <div className="chat-history-list">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`chat-history-item ${s.id === activeSessionId ? 'active' : ''}`}
              onClick={() => { setActiveSessionId(s.id); setView('chat') }}
            >
              <div className="chat-history-title">
                {editingSessionId === s.id ? (
                  <input
                    type="text"
                    className="chat-history-title-input"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleSaveRename}
                    onKeyDown={handleRenameKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  s.title
                )}
              </div>
              <div className="chat-history-bottom">
                <span className="chat-history-meta">
                  {new Date(s.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="chat-history-actions">
                  <button className="chat-history-action-btn edit-btn" onClick={(e) => handleStartRename(e, s)} title="Rename chat">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                  <button className="chat-history-action-btn delete-btn" onClick={(e) => handleDeleteSession(e, s.id)} title="Delete chat">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    )
  }

  return (
    <aside className="editor-chat-panel" aria-label="AI assistant">
      <div className="chat-panel-accent-line" aria-hidden="true" />

      <header className="chat-panel-header">
        <div className="agent-selector" ref={agentMenuRef}>
          <button
            type="button"
            className="agent-selector-trigger"
            onClick={() => setAgentMenuOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={agentMenuOpen}
          >
            <span
              className="agent-dot"
              style={{ background: agent.color, boxShadow: `0 0 6px ${agent.color}` }}
              aria-hidden="true"
            />
            <span className="agent-name">{agent.name}</span>
            <svg
              className="agent-chevron"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {agentMenuOpen && (
            <ul className="agent-menu" role="listbox">
              {AGENTS.map((a) => (
                <li key={a.id} role="option" aria-selected={a.id === agentId}>
                  <button
                    type="button"
                    className={`agent-option ${a.id === agentId ? 'agent-option--active' : ''}`}
                    onClick={() => handleAgentSelect(a.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="agent-dot"
                        style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }}
                        aria-hidden="true"
                      />
                      <span className="agent-option-name">{a.name}</span>
                    </div>
                    <span className="agent-option-desc">{a.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            className="chat-panel-icon-btn"
            onClick={() => setView('history')}
            title="Chat history"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <button
            type="button"
            className="chat-panel-icon-btn"
            onClick={handleNewChat}
            title="New chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="chat-panel-messages">
        {messages.map((m) => {
          if (m.role === 'system') {
            return (
              <div key={m.id} className="chat-system">
                <span className="chat-system-text">{m.content}</span>
              </div>
            )
          }
          if (m.role === 'assistant') {
            return (
              <div key={m.id} className="chat-message chat-message--ai">
                <div className="chat-avatar" aria-hidden="true">
                  <span
                    className="chat-avatar-dot"
                    style={{ background: agent.color, boxShadow: `0 0 4px ${agent.color}` }}
                  />
                </div>
                <div className="chat-bubble chat-bubble--ai">
                  <p className="chat-text">{m.content}</p>
                </div>
              </div>
            )
          }
          return (
            <div key={m.id} className="chat-message chat-message--user">
              <div className="chat-bubble chat-bubble--user">
                {m.content && <p className="chat-text">{m.content}</p>}
                {m.attachments && m.attachments.length > 0 && (
                  <div className="chat-bubble-attachments">
                    {m.attachments.map((a) => (
                      <span key={a.id} className="attachment-chip">
                        <FileIcon />
                        <span className="attachment-name">{a.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {pendingFiles.length > 0 && (
        <div className="chat-panel-pending">
          {pendingFiles.map((f) => (
            <span key={f.id} className="attachment-chip attachment-chip--removable">
              <FileIcon />
              <span className="attachment-name">{f.name}</span>
              <button
                type="button"
                className="attachment-remove"
                onClick={() => removeFile(f.id)}
                aria-label={`Remove ${f.name}`}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="chat-panel-input">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <button
          type="button"
          className="chat-panel-input-attach"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
          title="Attach file"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          className="chat-panel-input-textarea"
          placeholder="Ask the agent..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          type="button"
          className="chat-panel-input-send"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </aside>
  )
}

function FileIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}