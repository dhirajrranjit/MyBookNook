import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { saveCustomContents } from '../db/bookRepository'
import { db } from '../db/database'
import type { CustomContentItem } from '../types/entities'
import { createId } from '../utils/ids'
import {
  downloadContentsBackup,
  importContentsBackup,
} from '../features/library/customContentsTransfer'

interface ParentToolsPageProps {
  onDone: () => void
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function formatBytes(value?: number) {
  if (value === undefined) return 'Not available'
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export function ParentToolsPage({ onDone }: ParentToolsPageProps) {
  const [usage, setUsage] = useState<number>()
  const [quota, setQuota] = useState<number>()
  const [persistent, setPersistent] = useState<boolean | null>(null)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const books = useLiveQuery(() => db.books.orderBy('title').toArray(), [])
  const [selectedBookId, setSelectedBookId] = useState('')
  const [draftContents, setDraftContents] = useState<CustomContentItem[]>([])
  const [contentsStatus, setContentsStatus] = useState('')
  const [transferStatus, setTransferStatus] = useState('')
  const contentsImportRef = useRef<HTMLInputElement>(null)
  const selectedBook = books?.find((book) => book.id === selectedBookId)

  useEffect(() => {
    if (!selectedBookId && books?.length) setSelectedBookId(books[0].id)
  }, [books, selectedBookId])

  useEffect(() => {
    setDraftContents((selectedBook?.customContents ?? []).map((item) => ({ ...item })))
    setContentsStatus('')
  }, [selectedBookId, selectedBook?.customContents])

  const refreshStorage = async () => {
    if (!navigator.storage) return
    const estimate = await navigator.storage.estimate()
    setUsage(estimate.usage)
    setQuota(estimate.quota)
    setPersistent(await navigator.storage.persisted?.() ?? null)
  }

  useEffect(() => {
    let disposed = false
    if (navigator.storage) {
      void Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted?.() ?? Promise.resolve(null),
      ]).then(([estimate, isPersistent]) => {
        if (disposed) return
        setUsage(estimate.usage)
        setQuota(estimate.quota)
        setPersistent(isPersistent)
      })
    }
    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    return () => {
      disposed = true
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
    }
  }, [])

  const requestPersistence = async () => {
    if (!navigator.storage?.persist) return
    setPersistent(await navigator.storage.persist())
    await refreshStorage()
  }

  const importContents = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const result = await importContentsBackup(await file.text())
      const skippedMessage = result.skipped.length
        ? ` ${result.skipped.length} ${result.skipped.length === 1 ? 'book was' : 'books were'} not found on this device.`
        : ''
      setTransferStatus(`${result.updated} ${result.updated === 1 ? 'book' : 'books'} updated.${skippedMessage}`)
    } catch (reason) {
      setTransferStatus(reason instanceof Error ? reason.message : 'The contents backup could not be imported.')
    }
  }

  return (
    <section className="parent-page" aria-labelledby="parent-title">
      <div className="parent-heading">
        <div>
          <p className="eyebrow">Grown-ups only</p>
          <h1 id="parent-title">Parent Tools</h1>
        </div>
        <button className="secondary-button" type="button" onClick={onDone}>Done</button>
      </div>

      <div className="parent-grid">
        <article className="tool-card storage-card">
          <span className="tool-number" aria-hidden="true">01</span>
          <h2>Keep books safe</h2>
          <p>Books exist only on this tablet. A future full backup will be the safest protection against device loss or cleared browser data.</p>
          <div className="storage-meter" aria-label={`${formatBytes(usage)} used out of ${formatBytes(quota)}`}>
            <span style={{ width: quota && usage ? `${Math.min(100, (usage / quota) * 100)}%` : '0%' }} />
          </div>
          <p className="storage-value">{formatBytes(usage)} used · {formatBytes(quota)} available</p>
          <button className="secondary-button" type="button" onClick={requestPersistence} disabled={!navigator.storage?.persist || persistent === true}>
            {persistent === true ? 'Protected storage requested' : 'Request protected storage'}
          </button>
          {persistent === false && <p className="warning-text">This browser did not grant protected storage. Keep regular backups once backup export is available.</p>}
        </article>

        <article className="tool-card">
          <span className="tool-number" aria-hidden="true">02</span>
          <h2>Install on iPad</h2>
          <ol>
            <li>Open this page in Safari.</li>
            <li>Tap the Share button.</li>
            <li>Choose <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>.</li>
          </ol>
          <p className="small-note">Open the Home Screen app once while online before testing it offline.</p>
        </article>

        <article className="tool-card">
          <span className="tool-number" aria-hidden="true">03</span>
          <h2>Install on Android</h2>
          <p>Use Chrome's install option, or the button below when it is available.</p>
          <button
            className="primary-button"
            type="button"
            disabled={!installPrompt}
            onClick={async () => {
              if (!installPrompt) return
              await installPrompt.prompt()
              await installPrompt.userChoice
              setInstallPrompt(null)
            }}
          >
            {installPrompt ? 'Install app' : 'Install option not available'}
          </button>
        </article>

        <article className="tool-card decision-card">
          <span className="tool-number" aria-hidden="true">04</span>
          <h2>Protected PDFs</h2>
          <p>Password-protected and unsupported encrypted PDFs are rejected. Unlock the PDF first, then add the unlocked copy.</p>
        </article>

        <article className="tool-card contents-editor-card">
          <span className="tool-number" aria-hidden="true">05</span>
          <h2>Custom contents</h2>
          <p>Add a simple chapter list for a PDF that does not include one. The book's built-in contents will be used first when available.</p>

          {books?.length ? (
            <div className="contents-editor">
              <label className="field-label" htmlFor="contents-book">Book</label>
              <select
                id="contents-book"
                value={selectedBookId}
                onChange={(event) => setSelectedBookId(event.target.value)}
              >
                {books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}
              </select>

              <div className="contents-editor-heading" aria-hidden="true">
                <span>Section name</span>
                <span>Page</span>
                <span />
              </div>

              <div className="custom-contents-rows">
                {draftContents.map((item, index) => (
                  <div className="custom-contents-row" key={item.id}>
                    <label className="sr-only" htmlFor={`section-title-${item.id}`}>Section {index + 1} name</label>
                    <input
                      id={`section-title-${item.id}`}
                      type="text"
                      value={item.title}
                      placeholder="For example: Dinosaurs"
                      onChange={(event) => setDraftContents((items) => items.map((entry) => (
                        entry.id === item.id ? { ...entry, title: event.target.value } : entry
                      )))}
                    />
                    <label className="sr-only" htmlFor={`section-page-${item.id}`}>Section {index + 1} page</label>
                    <input
                      id={`section-page-${item.id}`}
                      className="contents-page-input"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={selectedBook?.pageCount ?? 1}
                      value={item.pageNumber}
                      onChange={(event) => setDraftContents((items) => items.map((entry) => (
                        entry.id === item.id ? { ...entry, pageNumber: Number(event.target.value) } : entry
                      )))}
                    />
                    <button
                      className="remove-content-button"
                      type="button"
                      aria-label={`Remove ${item.title || `section ${index + 1}`}`}
                      onClick={() => setDraftContents((items) => items.filter((entry) => entry.id !== item.id))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {!draftContents.length && <p className="contents-editor-empty">No custom sections yet.</p>}

              <div className="contents-editor-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setDraftContents((items) => [
                    ...items,
                    { id: createId(), title: '', pageNumber: 1 },
                  ])}
                >
                  + Add section
                </button>
                <button
                  className="primary-button"
                  type="button"
                  disabled={!selectedBook}
                  onClick={async () => {
                    if (!selectedBook) return
                    try {
                      await saveCustomContents(selectedBook.id, draftContents)
                      setContentsStatus('Custom contents saved.')
                    } catch (reason) {
                      setContentsStatus(reason instanceof Error ? reason.message : 'Could not save the contents.')
                    }
                  }}
                >
                  Save contents
                </button>
              </div>
              {contentsStatus && <p className="contents-editor-status" role="status">{contentsStatus}</p>}

            </div>
          ) : (
            <p>Add a book to the bookshelf first, then return here to create its contents.</p>
          )}
        </article>

        <article className="tool-card contents-transfer-card">
          <span className="tool-number" aria-hidden="true">06</span>
          <h2>Use contents on another device</h2>
          <p>Export a small JSON file from this device. On the other device, add the same PDF books first, then import the JSON file. PDF files are not included.</p>
          <div className="contents-transfer-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={!books?.length}
              onClick={() => {
                downloadContentsBackup(books ?? [])
                setTransferStatus('Contents backup exported.')
              }}
            >
              Export contents
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => contentsImportRef.current?.click()}
            >
              Import contents
            </button>
            <input
              ref={contentsImportRef}
              className="visually-hidden-input"
              type="file"
              accept="application/json,.json"
              onChange={importContents}
            />
          </div>
          {transferStatus && <p className="contents-editor-status" role="status">{transferStatus}</p>}
        </article>
      </div>
    </section>
  )
}
