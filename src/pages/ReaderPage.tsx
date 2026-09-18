import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { RenderTask } from 'pdfjs-dist'
import { saveReadingProgress } from '../db/bookRepository'
import { PdfContentsPanel } from '../features/reader/PdfContentsPanel'
import type { LoadedPdf, PdfContentItem } from '../services/pdfService'
import type { BookRecord, FitMode } from '../types/entities'

interface ReaderPageProps {
  book: BookRecord
  onBack: () => void
}

export function ReaderPage({ book, onBack }: ReaderPageProps) {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null)
  const [pageNumber, setPageNumber] = useState(book.currentPage || 1)
  const [fitMode, setFitMode] = useState<FitMode>(book.readerPreferences.fitMode)
  const [zoom, setZoom] = useState(book.readerPreferences.zoom || 1)
  const [pageInput, setPageInput] = useState(String(book.currentPage || 1))
  const [contents, setContents] = useState<PdfContentItem[]>([])
  const [isContentsLoading, setIsContentsLoading] = useState(true)
  const [isContentsOpen, setIsContentsOpen] = useState(false)
  const [error, setError] = useState('')
  const [isRendering, setIsRendering] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let disposed = false
    let openedPdf: LoadedPdf | null = null
    const pdfSource = book.pdfData ?? book.pdfBlob

    if (!pdfSource) {
      setError('This saved copy is unavailable. Go back and add the same PDF again to repair it.')
      setIsContentsLoading(false)
      return
    }

    void import('../services/pdfService').then(({ loadPdfForReading }) => loadPdfForReading(pdfSource)).then(
      (nextPdf) => {
        if (disposed) {
          void nextPdf.destroy()
          return
        }
        openedPdf = nextPdf
        setLoadedPdf(nextPdf)
        void import('../services/pdfService').then(({ getPdfContents }) => getPdfContents(nextPdf.document)).then(
          (items) => {
            if (!disposed) setContents(items)
          },
          () => undefined,
        ).finally(() => {
          if (!disposed) setIsContentsLoading(false)
        })
      },
      () => setError('This saved copy is unavailable. Go back and add the same PDF again to repair it.'),
    )

    return () => {
      disposed = true
      if (openedPdf) void openedPdf.destroy()
    }
  }, [book.pdfBlob, book.pdfData])

  useEffect(() => {
    if (!loadedPdf || !canvasRef.current || !stageRef.current) return
    let renderTask: RenderTask | undefined
    let cancelled = false
    setIsRendering(true)

    void loadedPdf.document.getPage(pageNumber).then(async (page) => {
      if (cancelled || !canvasRef.current || !stageRef.current) return
      const canvas = canvasRef.current
      const stage = stageRef.current
      const natural = page.getViewport({ scale: 1 })
      const widthScale = Math.max(0.25, (stage.clientWidth - 32) / natural.width)
      const heightScale = Math.max(0.25, (stage.clientHeight - 32) / natural.height)
      const baseScale = fitMode === 'width' ? widthScale : Math.min(widthScale, heightScale)
      const scale = fitMode === 'custom' ? zoom : baseScale * zoom
      const viewport = page.getViewport({ scale })
      const deviceScale = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.floor(viewport.width * deviceScale)
      canvas.height = Math.floor(viewport.height * deviceScale)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) return
      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: deviceScale === 1 ? undefined : [deviceScale, 0, 0, deviceScale, 0, 0],
      })

      try {
        await renderTask.promise
        if (!cancelled) setIsRendering(false)
      } catch (reason) {
        if (!cancelled && !(reason instanceof Error && reason.name === 'RenderingCancelledException')) {
          setError('This page could not be drawn.')
        }
      } finally {
        page.cleanup()
      }
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [loadedPdf, pageNumber, fitMode, zoom])

  useEffect(() => {
    const preferences = { fitMode, zoom, readingDirection: 'left-to-right' as const }
    const timeout = window.setTimeout(() => {
      void saveReadingProgress(book.id, pageNumber, book.pageCount, preferences)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [book.id, book.pageCount, fitMode, pageNumber, zoom])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setPageNumber((page) => Math.min(book.pageCount, page + 1))
      if (event.key === 'ArrowLeft') setPageNumber((page) => Math.max(1, page - 1))
      if (event.key === 'Escape') {
        if (isContentsOpen) setIsContentsOpen(false)
        else onBack()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [book.pageCount, isContentsOpen, onBack])

  const nextPage = () => setPageNumber((page) => Math.min(book.pageCount, page + 1))
  const previousPage = () => setPageNumber((page) => Math.max(1, page - 1))
  const goToPage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const requestedPage = Number.parseInt(pageInput, 10)
    const safePage = Number.isFinite(requestedPage)
      ? Math.max(1, Math.min(book.pageCount, requestedPage))
      : pageNumber
    setPageNumber(safePage)
    setPageInput(String(safePage))
  }

  useEffect(() => setPageInput(String(pageNumber)), [pageNumber])

  return (
    <main className="reader-page">
      <header className="reader-header">
        <button className="reader-icon-button" type="button" onClick={onBack} aria-label="Back to bookshelf">←</button>
        <button className="reader-contents-button" type="button" onClick={() => setIsContentsOpen(true)}>
          <span aria-hidden="true">☰</span>
          <span>Contents</span>
        </button>
        <div className="reader-title">
          <strong>{book.title}</strong>
          <span>Page {pageNumber} of {book.pageCount}</span>
        </div>
        <div className="reader-tools" aria-label="Page size controls">
          <button type="button" onClick={() => { setFitMode('page'); setZoom(1) }}>Fit page</button>
          <button type="button" onClick={() => { setFitMode('width'); setZoom(1) }}>Fit width</button>
          <button type="button" onClick={() => { setFitMode('custom'); setZoom((value) => Math.max(0.5, value - 0.15)) }} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => { setFitMode('custom'); setZoom((value) => Math.min(3, value + 0.15)) }} aria-label="Zoom in">＋</button>
        </div>
      </header>

      {error ? (
        <div className="reader-error" role="alert">{error}</div>
      ) : (
        <div
          className="reader-stage"
          ref={stageRef}
          onDoubleClick={() => { setFitMode('custom'); setZoom((value) => (value > 1.3 ? 1 : 1.6)) }}
        >
          {isRendering && <div className="page-loader" role="status">Drawing page…</div>}
          <canvas ref={canvasRef} aria-label={`Page ${pageNumber} of ${book.title}`} />
        </div>
      )}

      <nav className="page-navigation" aria-label="Page navigation">
        <button type="button" onClick={previousPage} disabled={pageNumber <= 1}>← Previous</button>
        <form className="page-jump" onSubmit={goToPage}>
          <label htmlFor="page-number">Page</label>
          <input
            id="page-number"
            type="number"
            inputMode="numeric"
            min="1"
            max={book.pageCount}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onBlur={() => setPageInput(String(pageNumber))}
            aria-label={`Go to page, 1 through ${book.pageCount}`}
          />
          <span>of {book.pageCount}</span>
        </form>
        <button type="button" onClick={nextPage} disabled={pageNumber >= book.pageCount}>Next →</button>
      </nav>

      {isContentsOpen && (
        <PdfContentsPanel
          items={contents}
          isLoading={isContentsLoading}
          onClose={() => setIsContentsOpen(false)}
          onSelect={(selectedPage) => {
            setPageNumber(Math.max(1, Math.min(book.pageCount, selectedPage)))
            setIsContentsOpen(false)
          }}
        />
      )}
    </main>
  )
}
