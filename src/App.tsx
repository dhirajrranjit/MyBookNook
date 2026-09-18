import { useEffect, useState } from 'react'
import { db } from './db/database'
import { APP_CONFIG, type AppScreen } from './app/appConfig'
import { BookshelfPage } from './pages/BookshelfPage'
import { ParentToolsPage } from './pages/ParentToolsPage'
import { ReaderPage } from './pages/ReaderPage'
import type { BookRecord } from './types/entities'

function App() {
  const [screen, setScreen] = useState<AppScreen>('bookshelf')
  const [activeBook, setActiveBook] = useState<BookRecord | null>(null)

  const openBook = (book: BookRecord) => {
    setActiveBook(book)
    setScreen('reader')
  }

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()

    void Promise.resolve(
      context.registerTool(
        {
          name: 'list_books',
          title: 'List books',
          description: 'List the PDF books stored on this device without exposing their file contents.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute: async () => {
            const books = await db.books.toArray()
            return books.map(({ id, title, author, pageCount, currentPage }) => ({
              id,
              title,
              author,
              pageCount,
              currentPage,
            }))
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined)

    return () => lifecycle.abort()
  }, [])

  if (screen === 'reader' && activeBook) {
    return (
      <ReaderPage
        book={activeBook}
        onBack={() => {
          setActiveBook(null)
          setScreen('bookshelf')
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="brand-button"
          type="button"
          onClick={() => setScreen('bookshelf')}
          aria-label="Go to bookshelf"
        >
          <span className="brand-mark" aria-hidden="true">BN</span>
          <span>{APP_CONFIG.name}</span>
        </button>
        <button
          className="parent-tools-button"
          type="button"
          onClick={() => setScreen(screen === 'parent-tools' ? 'bookshelf' : 'parent-tools')}
          aria-pressed={screen === 'parent-tools'}
        >
          <span aria-hidden="true">⚙</span>
          Parent Tools
        </button>
      </header>

      <main>
        {screen === 'bookshelf' ? (
          <BookshelfPage onOpenBook={openBook} />
        ) : (
          <ParentToolsPage onDone={() => setScreen('bookshelf')} />
        )}
      </main>
    </div>
  )
}

export default App
