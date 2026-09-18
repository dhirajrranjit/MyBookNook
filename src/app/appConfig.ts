export const APP_CONFIG = {
  name: 'My Book Nook',
  shortName: 'Book Nook',
  databaseName: 'my-book-nook',
  schemaVersion: 1,
  backupFormatVersion: 1,
} as const

export type AppScreen = 'bookshelf' | 'reader' | 'parent-tools'
