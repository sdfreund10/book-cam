import convert from 'heic-convert'
import { isBlank } from '../utils/strings.js'

export class ImageConversionError extends Error {
  constructor (message: string, cause?: unknown) {
    super(message)
    this.name = 'ImageConversionError'
    this.cause = cause
  }
}

// iPhones default to HEIC/HEIF for photos, which vision models (and most
// browsers) can't read directly. Some clients label these correctly, others
// fall back to a generic mimetype, so we also sniff the filename extension.
const HEIC_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
])

const HEIC_EXTENSION_PATTERN = /\.(heic|heif)$/i

export function isHeicImage (mimeType: string, originalName?: string | null): boolean {
  if (HEIC_MIME_TYPES.has(mimeType.toLowerCase())) return true
  return !isBlank(originalName) && HEIC_EXTENSION_PATTERN.test(originalName)
}

export interface ImageInput {
  buffer: Buffer
  mimeType: string
  originalName?: string
}

export interface ConvertedImage {
  buffer: Buffer
  mimeType: string
}

/**
 * Transcodes HEIC/HEIF images to JPEG so the rest of the pipeline (vision
 * model, browser previews, etc.) can treat every upload the same way.
 * Non-HEIC images are returned untouched.
 */
export async function ensureVisionCompatibleImage (input: ImageInput): Promise<ConvertedImage> {
  if (!isHeicImage(input.mimeType, input.originalName)) {
    return { buffer: input.buffer, mimeType: input.mimeType }
  }

  try {
    const jpegBuffer = await convert({ buffer: input.buffer, format: 'JPEG', quality: 0.92 })
    return { buffer: jpegBuffer, mimeType: 'image/jpeg' }
  } catch (cause) {
    throw new ImageConversionError('Could not convert this HEIC/HEIF photo to a compatible format', cause)
  }
}
