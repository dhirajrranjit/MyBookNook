import { db } from './database'
import type { BookRecord, ReaderPreferences } from '../types/entities'

export async function findBookByHash(fileHash?: string) {
  if (!fileHash) return undefined
  return db.books.where('fileHash').equals(fileHash).first()
}

export async function saveImportedBook(book: BookRecord) {
  await db.transaction('rw', db.books, async () => {
    if (book.fileHash) {
      const duplicate = await findBookByHash(book.fileHash)
      if (duplicate && duplicate.id !== book.id) {
        throw new Error('This book is already in your nook.')
      }
    }
    await db.books.put(book)
  })
}

export async function saveReadingProgress(
  id: string,
  currentPage: number,
  pageCount: number,
  preferences: ReaderPreferences,
) {
  const safePage = Math.max(1, Math.min(currentPage, Math.max(pageCount, 1)))
  const readingPercentage = Math.round((safePage / Math.max(pageCount, 1)) * 100)

  await db.books.update(id, {
    currentPage: safePage,
    readingPercentage,
    lastOpenedAt: new Date().toISOString(),
    readerPreferences: preferences,
  })
}
