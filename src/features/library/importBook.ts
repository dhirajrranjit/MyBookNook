import { findBookByHash } from '../../db/bookRepository'
import type { BookRecord } from '../../types/entities'
import { createId } from '../../utils/ids'
import { calculateFileHash, ImportError, validatePdfFile } from './fileValidation'

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function prepareBookImport(file: File): Promise<BookRecord> {
  await validatePdfFile(file)
  const fileHash = await calculateFileHash(file)

  if (await findBookByHash(fileHash)) {
    throw new ImportError('This book is already in your nook.', 'duplicate')
  }

  const { inspectPdf } = await import('../../services/pdfService')
  const details = await inspectPdf(file)
  const book: BookRecord = {
    id: createId(),
    title: details.title || titleFromFileName(file.name) || 'Untitled book',
    author: details.author || '',
    fileName: file.name,
    fileSize: file.size,
    fileHash,
    pdfBlob: file,
    coverBlob: details.coverBlob,
    pageCount: details.pageCount,
    currentPage: 1,
    readingPercentage: 0,
    importedAt: new Date().toISOString(),
    isFavorite: false,
    collectionIds: [],
    readerPreferences: {
      fitMode: 'page',
      zoom: 1,
      readingDirection: 'left-to-right',
    },
    isPasswordProtected: false,
    isEncryptedUnsupported: false,
  }

  return book
}
