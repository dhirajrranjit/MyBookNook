import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BookRecord } from '../../types/entities'
import { db } from '../../db/database'
import { createContentsBackup, importContentsBackup } from './customContentsTransfer'

function makeBook(overrides: Partial<BookRecord> = {}): BookRecord {
  return {
    id: 'book-local',
    title: 'Test Book',
    author: '',
    fileName: 'test.pdf',
    fileSize: 6,
    fileHash: 'matching-file-hash',
    pdfData: new TextEncoder().encode('%PDF-').buffer,
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

describe('custom contents transfer', () => {
  beforeEach(async () => {
    await db.open()
    await db.books.clear()
  })

  afterEach(async () => {
    await db.books.clear()
  })

  it('imports contents into the same PDF stored with a different local id', async () => {
    const source = makeBook({
      id: 'book-source',
      customContents: [{ id: 'chapter-1', title: 'Dinosaurs', pageNumber: 6 }],
    })
    const backup = createContentsBackup([source])
    await db.books.put(makeBook({ id: 'book-other-device', customContents: [] }))

    const result = await importContentsBackup(JSON.stringify(backup))

    expect(result).toEqual({ updated: 1, skipped: [] })
    expect((await db.books.get('book-other-device'))?.customContents).toEqual(source.customContents)
  })

  it('reports books that have not been added on the receiving device', async () => {
    const backup = createContentsBackup([makeBook({ title: 'Missing Book' })])

    const result = await importContentsBackup(JSON.stringify(backup))

    expect(result).toEqual({ updated: 0, skipped: ['Missing Book'] })
  })

  it('rejects unrelated JSON files', async () => {
    await expect(importContentsBackup('{"hello":"world"}')).rejects.toThrow('valid My Book Nook')
  })
})
