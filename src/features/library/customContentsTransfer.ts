import { db } from '../../db/database'
import type { BookRecord, CustomContentItem } from '../../types/entities'
import { createId } from '../../utils/ids'

const BACKUP_KIND = 'my-book-nook-custom-contents'
const SCHEMA_VERSION = 1

interface ContentsBackupBook {
  fileHash?: string
  fileName: string
  title: string
  pageCount: number
  customContents: CustomContentItem[]
}

interface ContentsBackup {
  kind: typeof BACKUP_KIND
  schemaVersion: typeof SCHEMA_VERSION
  exportedAt: string
  books: ContentsBackupBook[]
}

export interface ContentsImportResult {
  updated: number
  skipped: string[]
}

export function createContentsBackup(books: BookRecord[]): ContentsBackup {
  return {
    kind: BACKUP_KIND,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    books: books.map((book) => ({
      fileHash: book.fileHash,
      fileName: book.fileName,
      title: book.title,
      pageCount: book.pageCount,
      customContents: (book.customContents ?? []).map((item) => ({ ...item })),
    })),
  }
}

function isBackup(value: unknown): value is ContentsBackup {
  if (!value || typeof value !== 'object') return false
  const backup = value as Partial<ContentsBackup>
  return backup.kind === BACKUP_KIND
    && backup.schemaVersion === SCHEMA_VERSION
    && Array.isArray(backup.books)
    && backup.books.every((book) => (
      book
      && typeof book.fileName === 'string'
      && typeof book.title === 'string'
      && Number.isFinite(book.pageCount)
      && Array.isArray(book.customContents)
      && book.customContents.every((item) => (
        item
        && typeof item.title === 'string'
        && Number.isFinite(item.pageNumber)
      ))
    ))
}

export async function importContentsBackup(jsonText: string): Promise<ContentsImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('That file is not a valid My Book Nook contents backup.')
  }

  if (!isBackup(parsed)) {
    throw new Error('That file is not a valid My Book Nook contents backup.')
  }

  const localBooks = await db.books.toArray()
  const skipped: string[] = []
  let updated = 0

  await db.transaction('rw', db.books, async () => {
    for (const backupBook of parsed.books) {
      const match = localBooks.find((book) => (
        Boolean(backupBook.fileHash) && book.fileHash === backupBook.fileHash
      )) ?? localBooks.find((book) => (
        book.fileName === backupBook.fileName && book.pageCount === backupBook.pageCount
      ))

      if (!match) {
        skipped.push(backupBook.title)
        continue
      }

      const customContents = backupBook.customContents
        .map((item) => ({
          id: typeof item.id === 'string' && item.id ? item.id : createId(),
          title: item.title.trim(),
          pageNumber: Math.max(1, Math.min(match.pageCount, Math.round(item.pageNumber))),
        }))
        .filter((item) => item.title.length > 0)

      await db.books.update(match.id, { customContents })
      updated += 1
    }
  })

  return { updated, skipped }
}

export function downloadContentsBackup(books: BookRecord[]) {
  const backup = createContentsBackup(books)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `my_book_nook_contents_${date}.json`
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
