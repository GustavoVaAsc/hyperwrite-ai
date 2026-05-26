import { useState, useEffect, useRef } from 'react'
import { getApiUrl, getHeaders } from '../../services/api'
import './SkillsModal.css'

export interface SkillFull {
  id: string
  name: string
  description: string
  content: string
  is_builtin: boolean
  owner_id: number | null
}

interface SkillsModalProps {
  agentId: string
  agentSkillIds: string[]
  onClose: () => void
  onSkillsChanged: () => void
}

type View = 'list' | 'create' | 'edit'

export function SkillsModal({ agentId, agentSkillIds, onClose, onSkillsChanged }: SkillsModalProps) {
  const [allSkills, setAllSkills] = useState<SkillFull[]>([])
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set(agentSkillIds))
  const [view, setView] = useState<View>('list')
  const [editingSkill, setEditingSkill] = useState<SkillFull | null>(null)
  const [saving, setSaving] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formContent, setFormContent] = useState('')
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSkills()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function fetchSkills() {
    try {
      const res = await fetch(`${getApiUrl()}/api/agentes/skills`, { headers: getHeaders() })
      if (!res.ok) return
      const data: SkillFull[] = await res.json()
      setAllSkills(data)
    } catch {}
  }

  async function toggleSkill(skillId: string) {
    const next = new Set(assignedIds)
    if (next.has(skillId)) {
      next.delete(skillId)
    } else {
      next.add(skillId)
    }
    setAssignedIds(next)

    try {
      await fetch(`${getApiUrl()}/api/agentes/${agentId}/skills`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ skill_ids: Array.from(next) }),
      })
      onSkillsChanged()
    } catch {}
  }

  function openCreate() {
    setFormName('')
    setFormDesc('')
    setFormContent('')
    setEditingSkill(null)
    setView('create')
  }

  function openEdit(skill: SkillFull) {
    setFormName(skill.name)
    setFormDesc(skill.description)
    setFormContent(skill.content)
    setEditingSkill(skill)
    setView('edit')
  }

  async function handleSave() {
    if (!formName.trim() || !formDesc.trim() || !formContent.trim()) return
    setSaving(true)

    try {
      if (view === 'create') {
        const res = await fetch(`${getApiUrl()}/api/agentes/skills`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ name: formName, description: formDesc, content: formContent }),
        })
        if (res.ok) {
          await fetchSkills()
          onSkillsChanged()
          setView('list')
        }
      } else if (view === 'edit' && editingSkill) {
        const res = await fetch(`${getApiUrl()}/api/agentes/skills/${editingSkill.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ name: formName, description: formDesc, content: formContent }),
        })
        if (res.ok) {
          await fetchSkills()
          onSkillsChanged()
          setView('list')
        }
      }
    } catch {}
    setSaving(false)
  }

  async function handleDelete(skillId: string) {
    try {
      const res = await fetch(`${getApiUrl()}/api/agentes/skills/${skillId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      })
      if (res.ok) {
        const next = new Set(assignedIds)
        next.delete(skillId)
        setAssignedIds(next)
        await fetchSkills()
        onSkillsChanged()
        if (view === 'edit') setView('list')
      }
    } catch {}
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div className="skills-modal-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="skills-modal">
        <header className="skills-modal-header">
          {view === 'list' ? (
            <>
              <h3 className="skills-modal-title">Skills</h3>
              <div className="skills-modal-header-actions">
                <button type="button" className="skills-btn skills-btn--create" onClick={openCreate}>
              + New
                </button>
                <button type="button" className="skills-modal-close" onClick={onClose} aria-label="Close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" className="skills-back-btn" onClick={() => setView('list')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
            Back
              </button>
          <h3 className="skills-modal-title">{view === 'create' ? 'New Skill' : 'Edit Skill'}</h3>
              <button type="button" className="skills-modal-close" onClick={onClose} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </>
          )}
        </header>

        {view === 'list' ? (
          <div className="skills-list">
            {allSkills.length === 0 && (
          <p className="skills-empty">No skills available yet.</p>
            )}
            {allSkills.map((skill) => (
              <div key={skill.id} className="skills-item">
                <button
                  type="button"
                  className={`skills-toggle ${assignedIds.has(skill.id) ? 'skills-toggle--on' : ''}`}
                  onClick={() => toggleSkill(skill.id)}
                  aria-label={assignedIds.has(skill.id) ? 'Disable skill' : 'Enable skill'}
                >
                  <span className="skills-toggle-knob" />
                </button>
                <div className="skills-item-info">
                  <span className="skills-item-name">
                    {skill.name}
                {skill.is_builtin && <span className="skills-builtin-badge">builtin</span>}
                  </span>
                  <span className="skills-item-desc">{skill.description}</span>
                </div>
                {!skill.is_builtin && (
                  <div className="skills-item-actions">
                <button type="button" className="skills-action-btn" onClick={() => openEdit(skill)} title="Edit">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                <button type="button" className="skills-action-btn skills-action-btn--danger" onClick={() => handleDelete(skill.id)} title="Delete">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-2 14H7L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="skills-form">
            <label className="skills-form-label">
          Name
              <input
                className="skills-form-input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Academic Citations"
                maxLength={100}
              />
            </label>
            <label className="skills-form-label">
          Description
              <input
                className="skills-form-input"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
            placeholder="Brief summary of what this skill teaches"
              />
            </label>
            <label className="skills-form-label">
          Content (Markdown)
              <textarea
                className="skills-form-textarea"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
            placeholder={"## My Skill\n\nInstructions for the agent...\n\n- Step 1\n- Step 2"}
                rows={10}
              />
            </label>
            <div className="skills-form-actions">
              {view === 'edit' && editingSkill && (
                <button
                  type="button"
                  className="skills-btn skills-btn--danger"
                  onClick={() => handleDelete(editingSkill.id)}
                >
              Delete
                </button>
              )}
              <button type="button" className="skills-btn skills-btn--secondary" onClick={() => setView('list')}>
            Cancel
              </button>
              <button
                type="button"
                className="skills-btn skills-btn--primary"
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formDesc.trim() || !formContent.trim()}
              >
            {saving ? 'Saving...' : view === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
