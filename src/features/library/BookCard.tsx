import type { CSSProperties } from 'react'
import type { BookRecord } from '../../types/entities'
import { BookCover } from '../../components/BookCover'

interface BookCardProps {
  book: BookRecord
  onOpen: (book: BookRecord) => void
}

export function BookCard({ book, onOpen }: BookCardProps) {
  return (
    <button className="book-card" type="button" onClick={() => onOpen(book)}>
      <span className="book-cover">
        <BookCover cover={book.coverBlob} title={book.title} />
        {book.readingPercentage > 0 && (
          <span className="cover-progress" style={{ '--progress': `${book.readingPercentage}%` } as CSSProperties}>
            <span className="sr-only">{book.readingPercentage}% read</span>
          </span>
        )}
      </span>
      <span className="book-title">{book.title}</span>
      <span className="book-meta">{book.author || `${book.pageCount} pages`}</span>
    </button>
  )
}
