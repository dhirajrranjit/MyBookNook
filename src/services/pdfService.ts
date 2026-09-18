import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'
import { ImportError } from '../features/library/fileValidation'

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker()

export interface LoadedPdf {
  document: PDFDocumentProxy
  destroy: () => Promise<void>
}

export interface PdfContentItem {
  id: string
  title: string
  pageNumber?: number
  items: PdfContentItem[]
}

interface PdfOutlineNode {
  title: string
  dest: string | Array<unknown> | null
  items: PdfOutlineNode[]
}

async function resolveOutlinePage(document: PDFDocumentProxy, destination: PdfOutlineNode['dest']) {
  try {
    const explicitDestination = typeof destination === 'string'
      ? await document.getDestination(destination)
      : destination
    const target = explicitDestination?.[0]

    if (typeof target === 'number') return target + 1
    if (
      target
      && typeof target === 'object'
      && 'num' in target
      && 'gen' in target
      && typeof target.num === 'number'
      && typeof target.gen === 'number'
    ) {
      return (
        await document.getPageIndex(target as Parameters<PDFDocumentProxy['getPageIndex']>[0])
      ) + 1
    }
  } catch {
    return undefined
  }

  return undefined
}

export async function getPdfContents(document: PDFDocumentProxy): Promise<PdfContentItem[]> {
  const outline = (await document.getOutline().catch(() => [])) as PdfOutlineNode[] | null

  const normalize = async (items: PdfOutlineNode[], parentId = 'contents'): Promise<PdfContentItem[]> => (
    Promise.all(items.map(async (item, index) => {
      const id = `${parentId}-${index}`
      return {
        id,
        title: item.title.trim() || 'Untitled section',
        pageNumber: await resolveOutlinePage(document, item.dest),
        items: await normalize(item.items ?? [], id),
      }
    }))
  )

  return normalize(outline ?? [])
}

async function openDocument(bytes: Uint8Array): Promise<LoadedPdf> {
  const loadingTask = pdfjs.getDocument({ data: bytes })

  return new Promise((resolve, reject) => {
    let settled = false

    loadingTask.onPassword = () => {
      if (settled) return
      settled = true
      void loadingTask.destroy()
      reject(
        new ImportError(
          'Password-protected books are not supported yet. Please use an unlocked PDF.',
          'password-protected',
        ),
      )
    }

    void loadingTask.promise.then(
      (document) => {
        if (settled) {
          void loadingTask.destroy()
          return
        }
        settled = true
        resolve({ document, destroy: () => loadingTask.destroy() })
      },
      () => {
        if (settled) return
        settled = true
        reject(
          new ImportError(
            'This PDF could not be opened. It may be damaged or use unsupported encryption.',
            'unreadable',
          ),
        )
      },
    )
  })
}

export async function inspectPdf(file: Blob) {
  const loadedPdf = await openDocument(new Uint8Array(await file.arrayBuffer()))
  const { document } = loadedPdf
  try {
    const metadata = await document.getMetadata().catch(() => undefined)
    const info = metadata?.info as { Title?: string; Author?: string } | undefined
    const coverBlob = await renderCover(document)

    return {
      pageCount: document.numPages,
      title: info?.Title?.trim() || undefined,
      author: info?.Author?.trim() || undefined,
      coverBlob,
    }
  } finally {
    await loadedPdf.destroy()
  }
}

async function renderCover(document: PDFDocumentProxy) {
  const page = await document.getPage(1)
  const naturalViewport = page.getViewport({ scale: 1 })
  const scale = Math.min(1.5, 360 / naturalViewport.width)
  const viewport = page.getViewport({ scale })
  const canvas = window.document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new ImportError('This book cover could not be created.', 'unreadable')

  await page.render({ canvas, canvasContext: context, viewport }).promise
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  canvas.width = 0
  canvas.height = 0
  page.cleanup()
  if (!blob) throw new ImportError('This book cover could not be created.', 'unreadable')
  return blob
}

export async function loadPdfForReading(pdfBlob: Blob) {
  return openDocument(new Uint8Array(await pdfBlob.arrayBuffer()))
}
