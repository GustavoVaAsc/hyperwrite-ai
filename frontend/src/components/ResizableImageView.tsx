import { useRef, useState, useCallback } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

export function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [resizing, setResizing] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)

    const startX = e.clientX
    const startWidth = imgRef.current?.offsetWidth || 300

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.max(50, startWidth + delta)
      if (imgRef.current) {
        imgRef.current.style.width = `${newWidth}px`
      }
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      const delta = upEvent.clientX - startX
      const newWidth = Math.max(50, startWidth + delta)
      updateAttributes({ width: `${newWidth}px` })
      setResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [updateAttributes])

  return (
    <NodeViewWrapper className="resizable-image-wrapper" data-drag-handle>
      <div className={`resizable-image-container ${selected ? 'selected' : ''} ${resizing ? 'resizing' : ''}`}>
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || undefined}
          style={{ width: node.attrs.width || undefined }}
          draggable={false}
        />
        <div
          className="resize-handle resize-handle-right"
          onMouseDown={handleMouseDown}
        />
        <div
          className="resize-handle resize-handle-left"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setResizing(true)

            const startX = e.clientX
            const startWidth = imgRef.current?.offsetWidth || 300

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const delta = startX - moveEvent.clientX
              const newWidth = Math.max(50, startWidth + delta)
              if (imgRef.current) {
                imgRef.current.style.width = `${newWidth}px`
              }
            }

            const handleMouseUp = (upEvent: MouseEvent) => {
              const delta = startX - upEvent.clientX
              const newWidth = Math.max(50, startWidth + delta)
              updateAttributes({ width: `${newWidth}px` })
              setResizing(false)
              window.removeEventListener('mousemove', handleMouseMove)
              window.removeEventListener('mouseup', handleMouseUp)
            }

            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}
