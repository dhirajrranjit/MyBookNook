import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { BookRecord } from '../../types/entities'

interface BookImportDialogProps {
  book: BookRecord
  current: number
  total: number
  onCancel: () => void
  onSave: (details: { title: string; author: string }) => Promise<void>
}

export function BookImportDialog({ book, current, total, onCancel, onSave }: BookImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(book.title)
  const [author, setAuthor] = useState(book.author)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('Add a title before saving this book.')
      return
    }

    setError('')
    setIsSaving(true)
    try {
      await onSave({ title: cleanTitle, author: author.trim() })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This book could not be saved.')
      setIsSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="import-dialog"
      aria-labelledby="import-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <form onSubmit={submit}>
        <div className="import-dialog-heading">
          <div>
            <p className="eyebrow">Book {current} of {total}</p>
            <h2 id="import-dialog-title">Check the book details</h2>
          </div>
          <span className="import-page-count">{book.pageCount} pages</span>
        </div>

        <p className="import-file-name">From {book.fileName}</p>

        <label className="field-label" htmlFor="import-title">Title</label>
        <input
          id="import-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          autoFocus
          autoComplete="off"
        />

        <label className="field-label" htmlFor="import-author">Author <span>(optional)</span></label>
        <input
          id="import-author"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          autoComplete="off"
        />

        {error && <p className="dialog-error" role="alert">{error}</p>}

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button>
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? 'Adding…' : 'Add to bookshelf'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
