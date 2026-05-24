import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import type { SearchReplaceStorage, SearchReplaceCommands } from '../extensions/searchReplace'

interface FindReplaceProps {
  editor: Editor
  onClose: () => void
}

export function FindReplace({ editor, onClose }: FindReplaceProps) {
  const [findValue, setFindValue] = useState('')
  const [replaceValue, setReplaceValue] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const findInputRef = useRef<HTMLInputElement>(null)

  const cmd = editor.commands as unknown as SearchReplaceCommands
  const storage = (editor.storage as unknown as Record<string, unknown>).searchReplace as SearchReplaceStorage
  const { results, activeIndex } = storage

  useEffect(() => {
    findInputRef.current?.focus()
  }, [])

  useEffect(() => {
    return () => {
      cmd.setSearchTerm('')
    }
  }, [cmd])

  const handleFindChange = (value: string) => {
    setFindValue(value)
    cmd.setSearchTerm(value)
  }

  const handleReplaceChange = (value: string) => {
    setReplaceValue(value)
    cmd.setReplaceTerm(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      cmd.nextMatch()
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      cmd.previousMatch()
    }
  }

  return (
    <div className="find-replace-bar" onKeyDown={handleKeyDown}>
      <div className="find-replace-row">
        <input
          ref={findInputRef}
          type="text"
          className="find-replace-input"
          placeholder="Find..."
          value={findValue}
          onChange={(e) => handleFindChange(e.target.value)}
        />
        <span className="find-replace-count">
          {results.length > 0 ? `${activeIndex + 1}/${results.length}` : '0/0'}
        </span>
        <button
          className="find-replace-btn"
          onClick={() => cmd.previousMatch()}
          title="Previous (Shift+Enter)"
        >
          &#x25B2;
        </button>
        <button
          className="find-replace-btn"
          onClick={() => cmd.nextMatch()}
          title="Next (Enter)"
        >
          &#x25BC;
        </button>
        <button
          className="find-replace-btn"
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle Replace"
        >
          &#x21C4;
        </button>
        <button
          className="find-replace-btn find-replace-close"
          onClick={onClose}
          title="Close (Esc)"
        >
          &#x2715;
        </button>
      </div>
      {showReplace && (
        <div className="find-replace-row">
          <input
            type="text"
            className="find-replace-input"
            placeholder="Replace..."
            value={replaceValue}
            onChange={(e) => handleReplaceChange(e.target.value)}
          />
          <button
            className="find-replace-btn"
            onClick={() => cmd.replaceCurrent()}
            title="Replace"
          >
            Replace
          </button>
          <button
            className="find-replace-btn"
            onClick={() => cmd.replaceAll()}
            title="Replace All"
          >
            All
          </button>
        </div>
      )}
    </div>
  )
}
