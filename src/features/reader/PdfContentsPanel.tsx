import { useEffect, useRef, useState } from 'react'
import type { PdfContentItem } from '../../services/pdfService'

interface PdfContentsPanelProps {
  items: PdfContentItem[]
  isLoading: boolean
  onClose: () => void
  onSelect: (pageNumber: number) => void
}

interface ContentsItemProps {
  item: PdfContentItem
  depth: number
  onSelect: (pageNumber: number) => void
}

function ContentsItem({ item, depth, onSelect }: ContentsItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = item.items.length > 0

  return (
    <li>
      <div className="contents-row" style={{ '--contents-depth': depth } as React.CSSProperties}>
        {hasChildren ? (
          <button
            className="contents-expand"
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${item.title}`}
          >
            <span aria-hidden="true">›</span>
          </button>
        ) : (
          <span className="contents-spacer" aria-hidden="true" />
        )}
        <button
          className="contents-link"
          type="button"
          disabled={item.pageNumber === undefined && !hasChildren}
          onClick={() => {
            if (item.pageNumber !== undefined) onSelect(item.pageNumber)
            else if (hasChildren) setExpanded((value) => !value)
          }}
        >
          <span>{item.title}</span>
          {item.pageNumber !== undefined && <small>Page {item.pageNumber}</small>}
        </button>
      </div>
      {hasChildren && expanded && (
        <ul>
          {item.items.map((child) => (
            <ContentsItem key={child.id} item={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function PdfContentsPanel({ items, isLoading, onClose, onSelect }: PdfContentsPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="contents-dialog"
      aria-labelledby="contents-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="contents-header">
        <div>
          <p className="eyebrow">Navigate the book</p>
          <h2 id="contents-title">Contents</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close contents">×</button>
      </header>

      <div className="contents-body">
        {isLoading ? (
          <p className="contents-message" role="status">Loading contents…</p>
        ) : items.length ? (
          <ul className="contents-list">
            {items.map((item) => (
              <ContentsItem key={item.id} item={item} depth={0} onSelect={onSelect} />
            ))}
          </ul>
        ) : (
          <div className="contents-empty">
            <strong>No chapter list found</strong>
            <p>This PDF does not include a table of contents. A grown-up can add one in Parent Tools, or use the page-number box to jump through the book.</p>
          </div>
        )}
      </div>
    </dialog>
  )
}
