export type FitMode = 'page' | 'width' | 'custom'

export interface ReaderPreferences {
  fitMode: FitMode
  zoom: number
  readingDirection: 'left-to-right'
}

export interface BookRecord {
  id: string
  title: string
  author: string
  fileName: string
  fileSize: number
  fileHash?: string
  pdfBlob: Blob
  coverBlob: Blob
  pageCount: number
  currentPage: number
  readingPercentage: number
  lastOpenedAt?: string
  importedAt: string
  isFavorite: boolean
  collectionIds: string[]
  readerPreferences: ReaderPreferences
  isPasswordProtected: boolean
  isEncryptedUnsupported: boolean
}

export interface BookmarkRecord {
  id: string
  bookId: string
  pageNumber: number
  createdAt: string
  label?: string
}

export interface CollectionRecord {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface SettingRecord<T = unknown> {
  key: string
  value: T
  updatedAt: string
}
