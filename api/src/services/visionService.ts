import { Anthropic } from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { isBlank } from '../utils/strings.js'

export class VisionNotConfiguredError extends Error {
  constructor () {
    super('ANTHROPIC_API_KEY is not configured on the server')
    this.name = 'VisionNotConfiguredError'
  }
}

export class VisionRequestError extends Error {
  constructor (message: string, cause?: unknown) {
    super(message)
    this.name = 'VisionRequestError'
    this.cause = cause
  }
}

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Claude's vision input only accepts these raster formats.
type SupportedImageMimeType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

const SUPPORTED_MIME_TYPES: ReadonlySet<SupportedImageMimeType> = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
])

function isSupportedMimeType (value: string): value is SupportedImageMimeType {
  return (SUPPORTED_MIME_TYPES as ReadonlySet<string>).has(value)
}

const bookVisionSchema = z.object({
  title: z.string().nullable(),
  author: z.string().nullable(),
  confidence: z.enum(['high', 'medium', 'low'])
})

const bookVisionOutputFormat = zodOutputFormat(bookVisionSchema)

const SYSTEM_PROMPT = [
  'You identify books from a photo of their cover.',
  'Look at the image and determine the most likely book title and author.',
  'If you cannot make out enough of the cover to be reasonably confident, set title and/or author to null.',
  'Set confidence to "high", "medium", or "low" based on how legible and unambiguous the cover is.'
].join(' ')

export interface CoverIdentification {
  title: string | null
  author: string | null
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Sends a book cover photo to a vision-capable LLM and asks it to guess the
 * title and author. This is intentionally a thin, swappable wrapper -- the
 * exact model, prompt, and provider can be changed without touching callers.
 *
 * @param imageBuffer - Raw image bytes.
 * @param mimeType - e.g. "image/jpeg".
 */
export async function identifyCoverFromImage (imageBuffer: Buffer, mimeType: string): Promise<CoverIdentification> {
  if (isBlank(process.env.ANTHROPIC_API_KEY)) {
    throw new VisionNotConfiguredError()
  }

  if (!isSupportedMimeType(mimeType)) {
    throw new VisionRequestError(`Unsupported image type for the vision model: ${mimeType}`)
  }

  const model = process.env.ANTHROPIC_VISION_MODEL ?? 'claude-sonnet-4-5'

  let message
  try {
    message = await anthropicClient.messages.parse({
      model,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBuffer.toString('base64')
              }
            },
            { type: 'text', text: 'What book is this?' }
          ]
        }
      ],
      output_config: {
        format: bookVisionOutputFormat
      }
    })
  } catch (cause) {
    throw new VisionRequestError('Failed to reach the vision model provider', cause)
  }

  const parsed = message.parsed_output
  if (parsed == null) {
    throw new VisionRequestError('Vision model returned an empty or unparsable response')
  }

  return {
    title: isBlank(parsed.title) ? null : parsed.title,
    author: isBlank(parsed.author) ? null : parsed.author,
    confidence: parsed.confidence
  }
}
