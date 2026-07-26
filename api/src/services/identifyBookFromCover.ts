import { randomUUID } from 'node:crypto'

import type { BookDraft } from '../types/book.js'
import { firstNonBlank, isBlank } from '../utils/strings.js'
import { withTiming } from '../utils/timing.js'
import { lookupBookMetadata } from './bookLookupService.js'
import { ensureVisionCompatibleImage, ImageConversionError } from './imageConversionService.js'
import { identifyCoverFromImage, VisionNotConfiguredError, VisionRequestError } from './visionService.js'

export interface IdentifyBookResult {
  draft: Partial<BookDraft>
  warnings: string[]
}

/**
 * Given a photo of a book cover, produces a best-effort BookDraft the caller
 * can use to pre-fill the "new book" form, along with any warnings the user
 * should see (e.g. low confidence, or the vision step being unavailable).
 */
export async function identifyBookFromCover (imageBuffer: Buffer, mimeType: string, originalName?: string): Promise<IdentifyBookResult> {
  const warnings: string[] = []
  // Short id to correlate the timing lines for a single scan in the logs.
  const scanId = randomUUID().slice(0, 8)

  return await withTiming(`[${scanId}] cover-scan total`, async () => {
    let convertedImage
    try {
      convertedImage = await withTiming(
        `[${scanId}] image-conversion`,
        async () => await ensureVisionCompatibleImage({ buffer: imageBuffer, mimeType, originalName })
      )
    } catch (err) {
      if (err instanceof ImageConversionError) {
        warnings.push('Couldn\'t convert that photo (HEIC/HEIF) to a compatible format. Try a JPEG/PNG photo, or fill in the details manually below.')
      } else {
        warnings.push('Something went wrong processing the photo. Fill in the details manually below.')
      }
      return { draft: { status: 'to read' }, warnings }
    }

    let guess
    try {
      guess = await withTiming(
        `[${scanId}] vision-model`,
        async () => await identifyCoverFromImage(convertedImage.buffer, convertedImage.mimeType)
      )
    } catch (err) {
      if (err instanceof VisionNotConfiguredError) {
        warnings.push('Cover scanning isn\'t configured on this server yet (missing ANTHROPIC_API_KEY). Fill in the details manually below.')
      } else if (err instanceof VisionRequestError) {
        warnings.push('Could not analyze the photo right now. Fill in the details manually below.')
      } else {
        warnings.push('Something went wrong analyzing the photo. Fill in the details manually below.')
      }
      return { draft: { status: 'to read' }, warnings }
    }

    if (isBlank(guess.title) && isBlank(guess.author)) {
      warnings.push('Couldn\'t make out a title or author from that photo. Try a clearer, well-lit shot, or fill in the details manually.')
      return { draft: { status: 'to read' }, warnings }
    }

    if (guess.confidence === 'low') {
      warnings.push('Low confidence match — please double check the details below.')
    }

    const enriched = await withTiming(
      `[${scanId}] book-lookup`,
      async () => await lookupBookMetadata({ title: guess.title, author: guess.author })
    )

    const draft: Partial<BookDraft> = {
      title: firstNonBlank(enriched?.title, guess.title),
      author: firstNonBlank(enriched?.author, guess.author),
      status: 'to read',
      coverImageUri: enriched?.coverImageUri
    }

    if (enriched == null) {
      warnings.push('Identified a possible match from the photo, but couldn\'t verify it against Open Library — please double check the details below.')
    }

    return { draft, warnings }
  })
}
