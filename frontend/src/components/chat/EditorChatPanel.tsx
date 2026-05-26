import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { getApiUrl, getHeaders } from '../../services/api'
import { SkillsModal } from './SkillsModal'
import './EditorChatPanel.css'

interface Skill {
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
interface Agent {
  id: string
  name: string
  description: string
  skills?: Skill[]
  color?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
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

interface EditorChatPanelProps {
  docId?: string
  onDocumentUpdated?: (content: Record<string, unknown>) => void
}

export function EditorChatPanel({ docId, onDocumentUpdated }: EditorChatPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([])
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
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [agentMenuOpen, setAgentMenuOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [skillsModalOpen, setSkillsModalOpen] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const agentMenuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamBufferRef = useRef('')

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0]
  const agentId = activeSession.agentId
  const agent = AGENTS.find((a) => a.id === agentId) ?? AGENTS[0]
  const token = useAuthStore((s) => s.accessToken)

  const updateActiveSession = useCallback((updates: Partial<ChatSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, ...updates, updatedAt: Date.now() } : s))
    )
  }, [activeSessionId])

  const messages = activeSession.messages
  const setMessages = useCallback((updater: React.SetStateAction<Message[]>) => {
    setSessions((prev) => prev.map((s) => {
      if (s.id === activeSessionId) {
        const nextMsgs = typeof updater === 'function' ? updater(s.messages) : updater
        return { ...s, messages: nextMsgs, updatedAt: Date.now() }
      }
      return s
    }))
  }, [activeSessionId])

  useEffect(() => {
    fetchAgents()
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

  useEffect(() => {
    return () => {
      wsRef.current?.close()
    }
  }, [])

  async function fetchAgents() {
    try {
      const res = await fetch(`${getApiUrl()}/api/agentes`, { headers: getHeaders() })
      if (!res.ok) return
      const rawData: Agent[] = await res.json()
      const data = rawData.map((a) => {
        const local = AGENTS.find((l) => l.id === a.id)
        return {
          ...a,
          name: local?.name || a.name,
          description: local?.description || a.description,
          color: local?.color || 'var(--cyan)'
        }
      })
      setAgents(data)
      if (data.length > 0 && !selectedAgent) {
        setSelectedAgent(data[0])
        setMessages([{
          id: `greeting-${Date.now()}`,
          role: 'assistant',
          content: `Hi — I'm ${data[0].name}. ${data[0].description}`,
        }])
      }
    } catch {}
  }

  async function refreshAgents() {
    try {
      const res = await fetch(`${getApiUrl()}/api/agentes`, { headers: getHeaders() })
      if (!res.ok) return
      const rawData: Agent[] = await res.json()
      const data = rawData.map((a) => {
        const local = AGENTS.find((l) => l.id === a.id)
        return {
          ...a,
          name: local?.name || a.name,
          description: local?.description || a.description,
          color: local?.color || 'var(--cyan)'
        }
      })
      setAgents(data)
      if (selectedAgent) {
        const updated = data.find((a) => a.id === selectedAgent.id)
        if (updated) setSelectedAgent(updated)
      }
    } catch {}
  }

  async function createConversation(agentId: string): Promise<string | null> {
    try {
      const res = await fetch(`${getApiUrl()}/api/agentes/conversations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ agent_id: agentId, document_id: docId || null }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.id
    } catch {
      return null
    }
  }

  function connectWebSocket(convId: string) {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const wsUrl = getApiUrl().replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsUrl}/ws/chat/${convId}?token=${token}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'token') {
        streamBufferRef.current += data.text
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last && last.role === 'assistant' && last.id.startsWith('stream-')) {
            return [...prev.slice(0, -1), { ...last, content: streamBufferRef.current }]
          }
          return prev
        })
      } else if (data.type === 'document_updated') {
        onDocumentUpdated?.(data.content)
      } else if (data.type === 'done') {
        setIsStreaming(false)
        streamBufferRef.current = ''
      } else if (data.type === 'error') {
        setIsStreaming(false)
        streamBufferRef.current = ''
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: 'system',
          content: `Error: ${data.detail}`,
        }])
      }
    }

    ws.onerror = () => {
      setIsStreaming(false)
    }

    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null
      }
    }

    wsRef.current = ws
    return ws
  }

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim()
    if ((!trimmed && pendingAttachments.length === 0) || !selectedAgent || isStreaming) return

    const fileNames = pendingAttachments.map(f => f.name).join(', ')
    let messageContent = trimmed
    if (pendingAttachments.length > 0) {
      messageContent += messageContent ? `\n\n[Attachments: ${fileNames}]` : `[Attachments: ${fileNames}]`
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
    }
    
    let newTitle = activeSession.title
    if (activeSession.messages.length <= 1 && messageContent) {
      newTitle = messageContent.slice(0, 25) + (messageContent.length > 25 ? '...' : '')
    }

    updateActiveSession({
      title: newTitle,
      messages: [...activeSession.messages, userMsg],
    })
    setDraft('')
    setIsStreaming(true)
    streamBufferRef.current = ''
    setPendingAttachments([])

    setMessages((prev) => [...prev, {
      id: `stream-${Date.now()}`,
      role: 'assistant',
      content: '',
    }])

    let convId = conversationId
    if (!convId) {
      convId = await createConversation(selectedAgent.id)
      if (!convId) {
        setIsStreaming(false)
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: 'system',
          content: 'Failed to create conversation',
        }])
        return
      }
      setConversationId(convId)
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const ws = connectWebSocket(convId)
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve()
        ws.onerror = () => reject()
      }).catch(() => {
        setIsStreaming(false)
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`,
          role: 'system',
          content: 'Failed to connect to chat service',
        }])
        return
      })
    }

    wsRef.current?.send(JSON.stringify({ type: 'message', content: messageContent }))
  }, [draft, pendingAttachments, selectedAgent, isStreaming, conversationId, token, activeSession, updateActiveSession, setMessages])

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `sess-${Date.now()}`,
      title: 'New Chat',
      agentId: selectedAgent?.id || AGENTS[0].id,
      messages: [buildGreeting(selectedAgent || AGENTS[0])],
      updatedAt: Date.now(),
    }
    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setView('chat')
    setDraft('')
    setConversationId(null)
    wsRef.current?.close()
    wsRef.current = null
  }

  const handleReset = () => {
    wsRef.current?.close()
    wsRef.current = null
    setConversationId(null)
    setMessages(selectedAgent ? [{
      id: `greeting-${Date.now()}`,
      role: 'assistant',
      content: `Hi — I'm ${selectedAgent.name}. ${selectedAgent.description}`,
    }] : [])
    setDraft('')
    setIsStreaming(false)
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
      setSessions((prev) => prev.map((s) => (s.id === editingSessionId ? { ...s, title: editingTitle.trim() } : s)))
    }
    setEditingSessionId(null)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSaveRename()
    if (e.key === 'Escape') setEditingSessionId(null)
  }

  const handleAgentSelect = (agent: Agent) => {
    setAgentMenuOpen(false)
    if (agent.id === selectedAgent?.id) return
    setSelectedAgent(agent)
    updateActiveSession({ agentId: agent.id })
    wsRef.current?.close()
    wsRef.current = null
    setConversationId(null)
    setMessages([
      {
        id: `switch-${Date.now()}`,
        role: 'system',
        content: `Switched to ${agent.name}.`,
      },
      {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: `Hi — I'm ${agent.name}. ${agent.description}`,
      },
    ])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = (draft.trim().length > 0 || pendingAttachments.length > 0) && !isStreaming

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
              style={{ background: selectedAgent?.color || agent.color || 'var(--cyan)', boxShadow: `0 0 6px ${selectedAgent?.color || agent.color || 'var(--cyan)'}` }}
              aria-hidden="true"
            />
            <span className="agent-name">{selectedAgent?.name || agent.name}</span>
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
              {agents.map((a) => (
                <li key={a.id} role="option" aria-selected={a.id === selectedAgent?.id}>
                  <button
                    type="button"
                    className={`agent-option ${a.id === selectedAgent?.id ? 'agent-option--active' : ''}`}
                    onClick={() => handleAgentSelect(a)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        className="agent-dot"
                        style={{ background: a.color || 'var(--cyan)', boxShadow: `0 0 6px ${a.color || 'var(--cyan)'}` }}
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

      {selectedAgent && (
        <div className="agent-info">
          {selectedAgent.skills && selectedAgent.skills.length > 0 && (
            <div className="agent-skills-tags">
              {selectedAgent.skills.map((skill) => (
                <span key={skill.id} className="skill-tag" title={skill.description}>
                  {skill.name}
                </span>
              ))}
            </div>
          )}
          <div className="agent-skills-manage">
            <button
              type="button"
              className="skill-tag skill-tag--manage"
              onClick={() => setSkillsModalOpen(true)}
              title="Manage skills"
            >
              {selectedAgent.skills && selectedAgent.skills.length > 0 ? 'Manage' : '+ Add skills'}
            </button>
          </div>
        </div>
      )}

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
                    style={{ background: agent.color || 'var(--cyan)', boxShadow: `0 0 4px ${agent.color || 'var(--cyan)'}` }}
                  />
                </div>
                <div className="chat-bubble chat-bubble--ai">
                  <p className="chat-text">{m.content || (isStreaming ? '...' : '')}</p>
                </div>
              </div>
            )
          }
          return (
            <div key={m.id} className="chat-message chat-message--user">
              <div className="chat-bubble chat-bubble--user">
                <p className="chat-text">{m.content}</p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {pendingAttachments.length > 0 && (
        <div className="chat-panel-pending">
          {pendingAttachments.map((file, i) => (
            <span key={`${file.name}-${i}`} className="attachment-chip attachment-chip--removable">
              <span className="attachment-name">{file.name}</span>
              <button
                type="button"
                className="attachment-remove"
                onClick={() => setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                title="Remove attachment"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          multiple
          onChange={(e) => {
            if (e.target.files) {
              setPendingAttachments((prev) => [...prev, ...Array.from(e.target.files!)])
            }
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className="chat-panel-input-attach"
          title="Attach file"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          disabled={isStreaming}
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

      {skillsModalOpen && selectedAgent && (
        <SkillsModal
          agentId={selectedAgent.id}
          agentSkillIds={selectedAgent.skills?.map((s) => s.id) || []}
          onClose={() => setSkillsModalOpen(false)}
          onSkillsChanged={refreshAgents}
        />
      )}
    </aside>
  )
}
