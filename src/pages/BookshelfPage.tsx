import { useRef, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { saveImportedBook } from '../db/bookRepository'
import { BookCard } from '../features/library/BookCard'
import { BookImportDialog } from '../features/library/BookImportDialog'
import { prepareBookImport } from '../features/library/importBook'
import type { BookRecord } from '../types/entities'

interface BookshelfPageProps {
  onOpenBook: (book: BookRecord) => void
}

export function BookshelfPage({ onOpenBook }: BookshelfPageProps) {
  const books = useLiveQuery(() => db.books.orderBy('importedAt').reverse().toArray(), [])
  const inputRef = useRef<HTMLInputElement>(null)
  const fileQueueRef = useRef<File[]>([])
  const importedCountRef = useRef(0)
  const totalFilesRef = useRef(0)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [draftBook, setDraftBook] = useState<BookRecord | null>(null)
  const [currentFileNumber, setCurrentFileNumber] = useState(1)

  const chooseBooks = () => inputRef.current?.click()

  const prepareNextBook = async () => {
    const file = fileQueueRef.current.shift()
    if (!file) {
      const imported = importedCountRef.current
      setStatus(imported ? `${imported} ${imported === 1 ? 'book' : 'books'} added.` : '')
      setIsImporting(false)
      return
    }

    const current = totalFilesRef.current - fileQueueRef.current.length
    setCurrentFileNumber(current)
    setStatus(`Checking ${current} of ${totalFilesRef.current}: ${file.name}`)
    try {
      setDraftBook(await prepareBookImport(file))
      setStatus('')
    } catch (reason) {
      fileQueueRef.current = []
      setError(reason instanceof Error ? reason.message : 'This book could not be added.')
      setIsImporting(false)
    }
  }

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    setError('')
    setStatus('')
    setIsImporting(true)
    fileQueueRef.current = files
    importedCountRef.current = 0
    totalFilesRef.current = files.length
    void prepareNextBook()
  }

  const saveDraftBook = async (details: { title: string; author: string }) => {
    if (!draftBook) return
    await saveImportedBook({ ...draftBook, ...details })
    importedCountRef.current += 1
    setDraftBook(null)
    await prepareNextBook()
  }

  const cancelImport = () => {
    const imported = importedCountRef.current
    fileQueueRef.current = []
    setDraftBook(null)
    setIsImporting(false)
    setStatus(imported ? `${imported} ${imported === 1 ? 'book' : 'books'} added. Import stopped.` : 'Import cancelled.')
  }

  return (
    <section className="bookshelf-page" aria-labelledby="bookshelf-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Alvin's bookshelf</p>
          <h1 id="bookshelf-title">Pick a book to read</h1>
        </div>
        <button className="primary-button" type="button" onClick={chooseBooks} disabled={isImporting}>
          <span aria-hidden="true">＋</span>
          {isImporting ? 'Adding…' : 'Add books'}
        </button>
        <input
          ref={inputRef}
          className="visually-hidden-input"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={handleFiles}
        />
      </div>

      <div className="status-region" aria-live="polite">
        {status && <p className="success-message">{status}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>

      {books === undefined ? (
        <div className="loading-state" role="status">Opening your bookshelf…</div>
      ) : books.length === 0 ? (
        <div className="empty-library">
          <div className="empty-book" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h2>Your bookshelf is ready</h2>
          <p>Ask a grown-up to add a PDF book from this tablet.</p>
          <button className="primary-button large" type="button" onClick={chooseBooks}>
            Add the first book
          </button>
          <p className="privacy-note">Books stay on this device.</p>
        </div>
      ) : (
        <div className="book-grid" aria-label="Books">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onOpen={onOpenBook} />
          ))}
        </div>
      )}

      {draftBook && (
        <BookImportDialog
          key={draftBook.id}
          book={draftBook}
          current={currentFileNumber}
          total={totalFilesRef.current}
          onCancel={cancelImport}
          onSave={saveDraftBook}
        />
      )}
    </section>
  )
}
