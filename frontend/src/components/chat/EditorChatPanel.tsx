import { useState, useRef, useEffect, useCallback } from 'react'
import './EditorChatPanel.css'

type Agent = {
  id: string
  name: string
  description: string
}

const AGENTS: Agent[] = [
  {
    id: 'cientifico',
    name: 'Scientist',
    description: 'Specialist in academic and technical texts.',
  },
  {
    id: 'narrativo',
    name: 'Narrative',
    description: 'Creative writing and storytelling assistant.',
  },
  {
    id: 'legal',
    name: 'Legal',
    description: 'Legal drafting assistant.',
  },
]

type Attachment = { id: string; name: string }
type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: Attachment[]
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
  const [agentId, setAgentId] = useState<string>('cientifico')
  const [agentMenuOpen, setAgentMenuOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => [buildGreeting(AGENTS[0])])
  const [draft, setDraft] = useState('')
  const [pendingFiles, setPendingFiles] = useState<Attachment[]>([])

  const agentMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const agent = AGENTS.find((a) => a.id === agentId) ?? AGENTS[0]

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
    setMessages((prev) => [...prev, userMsg])
    setDraft('')
    setPendingFiles([])
  }, [draft, pendingFiles])

  const handleReset = () => {
    setMessages([buildGreeting(agent)])
    setDraft('')
    setPendingFiles([])
  }

  const handleAgentSelect = (id: string) => {
    setAgentMenuOpen(false)
    if (id === agentId) return
    const next = AGENTS.find((a) => a.id === id)
    if (!next) return
    setAgentId(id)
    setMessages((prev) => [
      ...prev,
      {
        id: `switch-${Date.now()}`,
        role: 'system',
        content: `Switched to ${next.name}. ${next.description}`,
      },
    ])
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
            <span className="agent-dot" aria-hidden="true" />
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
                    <span className="agent-option-name">{a.name}</span>
                    <span className="agent-option-desc">{a.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          className="chat-panel-icon-btn"
          onClick={handleReset}
          aria-label="Reset conversation"
          title="Reset conversation"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <polyline points="3 3 3 8 8 8" />
          </svg>
        </button>
      </header>

      <p className="agent-description">{agent.description}</p>

      <div className="chat-panel-messages">
        {messages.map((m) => {
          if (m.role === 'system') {
            return (
              <div key={m.id} className="chat-system">
                <span className="chat-system-line" aria-hidden="true" />
                <span className="chat-system-text">{m.content}</span>
                <span className="chat-system-line" aria-hidden="true" />
              </div>
            )
          }
          if (m.role === 'assistant') {
            return (
              <div key={m.id} className="chat-message chat-message--ai">
                <div className="chat-avatar" aria-hidden="true">
                  <span className="chat-avatar-dot" />
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