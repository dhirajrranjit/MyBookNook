import { findBookByHash } from '../../db/bookRepository'
import type { BookRecord } from '../../types/entities'
import { createId } from '../../utils/ids'
import { calculateFileHash, validatePdfFile } from './fileValidation'

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
  const existingBook = await findBookByHash(fileHash)

  const { inspectPdf } = await import('../../services/pdfService')
  const details = await inspectPdf(file)
  const [pdfData, coverData] = await Promise.all([
    file.arrayBuffer(),
    details.coverBlob.arrayBuffer(),
  ])
  const book: BookRecord = {
    id: existingBook?.id ?? createId(),
    title: existingBook?.title || details.title || titleFromFileName(file.name) || 'Untitled book',
    author: existingBook?.author || details.author || '',
    fileName: file.name,
    fileSize: file.size,
    fileHash,
    pdfData,
    coverData,
    pageCount: details.pageCount,
    currentPage: Math.min(existingBook?.currentPage ?? 1, details.pageCount),
    readingPercentage: existingBook?.readingPercentage ?? 0,
    importedAt: existingBook?.importedAt ?? new Date().toISOString(),
    lastOpenedAt: existingBook?.lastOpenedAt,
    isFavorite: existingBook?.isFavorite ?? false,
    collectionIds: existingBook?.collectionIds ?? [],
    readerPreferences: existingBook?.readerPreferences ?? {
      fitMode: 'page',
      zoom: 1,
      readingDirection: 'left-to-right',
    },
    isPasswordProtected: false,
    isEncryptedUnsupported: false,
  }

  return book
}
