import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { getApiUrl, getHeaders } from '../../services/api'
import './EditorChatPanel.css'

interface Agent {
  id: string
  agent_id: string
  name: string
  description: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function EditorChatPanel() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [agentMenuOpen, setAgentMenuOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const agentMenuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamBufferRef = useRef('')

  const token = useAuthStore((s) => s.accessToken)

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
      const data: Agent[] = await res.json()
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

  async function createConversation(agentId: string): Promise<string | null> {
    try {
      const res = await fetch(`${getApiUrl()}/api/agentes/conversations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ agent_id: agentId }),
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
    if (!trimmed || !selectedAgent || isStreaming) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    setMessages((prev) => [...prev, userMsg])
    setDraft('')
    setIsStreaming(true)
    streamBufferRef.current = ''

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

    wsRef.current?.send(JSON.stringify({ type: 'message', content: trimmed }))
  }, [draft, selectedAgent, isStreaming, conversationId, token])

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

  const handleAgentSelect = (agent: Agent) => {
    setAgentMenuOpen(false)
    if (agent.id === selectedAgent?.id) return
    setSelectedAgent(agent)
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

  const canSend = draft.trim().length > 0 && !isStreaming

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
            <span className="agent-name">{selectedAgent?.name || 'Select agent'}</span>
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

      {selectedAgent && <p className="agent-description">{selectedAgent.description}</p>}

      <div className="chat-panel-messages">
        {messages.filter((m) => m.role !== 'system').map((m) => {
          if (m.role === 'assistant') {
            return (
              <div key={m.id} className="chat-message chat-message--ai">
                <div className="chat-avatar" aria-hidden="true">
                  <span className="chat-avatar-dot" />
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

      <div className="chat-panel-input">
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
    </aside>
  )
}
