import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BookRecord } from '../types/entities'
import { db } from './database'
import { saveImportedBook, saveReadingProgress } from './bookRepository'

function makeBook(overrides: Partial<BookRecord> = {}): BookRecord {
  return {
    id: 'book-1',
    title: 'Test Book',
    author: '',
    fileName: 'test.pdf',
    fileSize: 6,
    fileHash: 'same-hash',
    pdfData: new TextEncoder().encode('%PDF-').buffer,
    coverData: new TextEncoder().encode('cover').buffer,
    pageCount: 10,
    currentPage: 1,
    readingPercentage: 0,
    importedAt: '2026-09-18T00:00:00.000Z',
    isFavorite: false,
    collectionIds: [],
    readerPreferences: { fitMode: 'page', zoom: 1, readingDirection: 'left-to-right' },
    isPasswordProtected: false,
    isEncryptedUnsupported: false,
    ...overrides,
  }
}

describe('book repository', () => {
  beforeEach(async () => {
    await db.open()
    await db.books.clear()
  })

  afterEach(async () => {
    await db.books.clear()
  })

  it('blocks a duplicate hash without adding a partial row', async () => {
    await saveImportedBook(makeBook())
    await expect(saveImportedBook(makeBook({ id: 'book-2' }))).rejects.toThrow('already')
    await expect(db.books.count()).resolves.toBe(1)
  })

  it('clamps and saves reading progress', async () => {
    await saveImportedBook(makeBook())
    await saveReadingProgress('book-1', 99, 10, {
      fitMode: 'width',
      zoom: 1.2,
      readingDirection: 'left-to-right',
    })

    const saved = await db.books.get('book-1')
    expect(saved?.currentPage).toBe(10)
    expect(saved?.readingPercentage).toBe(100)
    expect(saved?.readerPreferences.fitMode).toBe('width')
  })

  it('allows the same book id to be reimported to repair its stored data', async () => {
    await saveImportedBook(makeBook({ pdfData: undefined, pdfBlob: new Blob(['old']) }))
    const repairedData = new TextEncoder().encode('%PDF-repaired').buffer

    await saveImportedBook(makeBook({ pdfData: repairedData, pdfBlob: undefined }))

    const saved = await db.books.get('book-1')
    expect(saved?.pdfData?.byteLength).toBe(repairedData.byteLength)
    expect(saved?.pdfBlob).toBeUndefined()
  })
})
