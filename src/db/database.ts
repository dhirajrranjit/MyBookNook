import Dexie, { type EntityTable } from 'dexie'
import { APP_CONFIG } from '../app/appConfig'
import type {
  BookRecord,
  BookmarkRecord,
  CollectionRecord,
  SettingRecord,
} from '../types/entities'

export class BookNookDatabase extends Dexie {
  books!: EntityTable<BookRecord, 'id'>
  bookmarks!: EntityTable<BookmarkRecord, 'id'>
  collections!: EntityTable<CollectionRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>

  constructor(name = APP_CONFIG.databaseName) {
    super(name)

    this.version(1).stores({
      books:
        'id, title, author, fileHash, importedAt, lastOpenedAt, isFavorite, *collectionIds',
      bookmarks: 'id, bookId, [bookId+pageNumber], createdAt',
      collections: 'id, &name, createdAt',
      settings: 'key',
    })
  }
}

export const db = new BookNookDatabase()
