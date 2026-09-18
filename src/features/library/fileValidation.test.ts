import { describe, expect, it } from 'vitest'
import { calculateFileHash, ImportError, validatePdfFile } from './fileValidation'

describe('PDF file validation', () => {
  it('accepts a PDF magic signature', async () => {
    const file = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])])
    await expect(validatePdfFile(file)).resolves.toBeUndefined()
  })

  it('rejects a renamed non-PDF', async () => {
    const file = new Blob(['not a pdf'], { type: 'application/pdf' })
    await expect(validatePdfFile(file)).rejects.toMatchObject<Partial<ImportError>>({ code: 'not-pdf' })
  })

  it('produces stable hashes for duplicate detection', async () => {
    const first = new Blob(['same book'])
    const second = new Blob(['same book'])
    await expect(calculateFileHash(first)).resolves.toBe(await calculateFileHash(second))
  })
})
