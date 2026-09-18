const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]

export class ImportError extends Error {
  readonly code:
    | 'empty-file'
    | 'not-pdf'
    | 'duplicate'
    | 'password-protected'
    | 'unreadable'

  constructor(
    message: string,
    code:
      | 'empty-file'
      | 'not-pdf'
      | 'duplicate'
      | 'password-protected'
      | 'unreadable',
  ) {
    super(message)
    this.name = 'ImportError'
    this.code = code
  }
}

export async function validatePdfFile(file: Blob) {
  if (file.size === 0) {
    throw new ImportError('This file is empty.', 'empty-file')
  }

  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  const isPdf = PDF_SIGNATURE.every((byte, index) => signature[index] === byte)
  if (!isPdf) {
    throw new ImportError('Choose a valid PDF file.', 'not-pdf')
  }
}

export async function calculateFileHash(file: Blob) {
  if (!globalThis.crypto?.subtle) return undefined
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
