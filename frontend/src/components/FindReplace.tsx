import { useState, useRef, useEffect, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import { searchReplacePluginKey, type SearchReplaceCommands } from '../extensions/searchReplace'

interface FindReplaceProps {
  editor: Editor
  onClose: () => void
}

export function FindReplace({ editor, onClose }: FindReplaceProps) {
  const [findValue, setFindValue] = useState('')
  const [replaceValue, setReplaceValue] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)
  const findInputRef = useRef<HTMLInputElement>(null)

  const cmd = editor.commands as unknown as SearchReplaceCommands

  useEffect(() => {
    findInputRef.current?.focus()
  }, [])

  const syncState = useCallback(() => {
    if (editor.isDestroyed) return
    const pluginState = searchReplacePluginKey.getState(editor.state)
    if (pluginState) {
      setMatchCount(pluginState.results.length)
      setActiveIdx(pluginState.activeIndex)
    }
  }, [editor])

  useEffect(() => {
    syncState()
    editor.on('transaction', syncState)
    return () => {
      editor.off('transaction', syncState)
    }
  }, [editor, syncState])

  const handleClose = () => {
    if (!editor.isDestroyed) {
      cmd.setSearchTerm('')
    }
    onClose()
  }

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
      handleClose()
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
          {matchCount > 0 ? `${activeIdx + 1}/${matchCount}` : '0/0'}
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
          onClick={handleClose}
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
