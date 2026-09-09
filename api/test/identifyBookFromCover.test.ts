import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImageConversionError } from '../src/services/imageConversionService.js'
import { VisionNotConfiguredError, VisionRequestError } from '../src/services/visionService.js'

vi.mock('../src/services/imageConversionService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/imageConversionService.js')>()
  return {
    ...actual,
    ensureVisionCompatibleImage: vi.fn()
  }
})

vi.mock('../src/services/visionService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/visionService.js')>()
  return {
    ...actual,
    identifyCoverFromImage: vi.fn()
  }
})

vi.mock('../src/services/bookLookupService.js', () => ({
  lookupBookMetadata: vi.fn()
}))

const { ensureVisionCompatibleImage } = await import('../src/services/imageConversionService.js')
const { identifyCoverFromImage } = await import('../src/services/visionService.js')
const { lookupBookMetadata } = await import('../src/services/bookLookupService.js')
const { identifyBookFromCover } = await import('../src/services/identifyBookFromCover.js')

const mockedConvert = vi.mocked(ensureVisionCompatibleImage)
const mockedVision = vi.mocked(identifyCoverFromImage)
const mockedLookup = vi.mocked(lookupBookMetadata)

const jpegBuffer = Buffer.from('fake-jpeg')

describe('identifyBookFromCover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedConvert.mockResolvedValue({ buffer: jpegBuffer, mimeType: 'image/jpeg' })
  })

  it('returns an empty draft when HEIC conversion fails', async () => {
    mockedConvert.mockRejectedValue(new ImageConversionError('convert failed'))

    const result = await identifyBookFromCover(Buffer.from('heic'), 'image/heic', 'cover.heic')

    expect(result.draft).toEqual({ status: 'to read' })
    expect(result.warnings).toEqual([
      'Couldn\'t convert that photo (HEIC/HEIF) to a compatible format. Try a JPEG/PNG photo, or fill in the details manually below.'
    ])
    expect(mockedVision).not.toHaveBeenCalled()
    expect(mockedLookup).not.toHaveBeenCalled()
  })

  it('returns an empty draft when the vision API key is missing', async () => {
    mockedVision.mockRejectedValue(new VisionNotConfiguredError())

    const result = await identifyBookFromCover(jpegBuffer, 'image/jpeg')

    expect(result.draft).toEqual({ status: 'to read' })
    expect(result.warnings).toEqual([
      'Cover scanning isn\'t configured on this server yet (missing ANTHROPIC_API_KEY). Fill in the details manually below.'
    ])
    expect(mockedLookup).not.toHaveBeenCalled()
  })

  it('returns an empty draft when the vision request fails', async () => {
    mockedVision.mockRejectedValue(new VisionRequestError('provider down'))

    const result = await identifyBookFromCover(jpegBuffer, 'image/jpeg')

    expect(result.draft).toEqual({ status: 'to read' })
    expect(result.warnings).toEqual([
      'Could not analyze the photo right now. Fill in the details manually below.'
    ])
    expect(mockedLookup).not.toHaveBeenCalled()
  })

  it('stops before lookup when title and author are both blank', async () => {
    mockedVision.mockResolvedValue({ title: null, author: null, confidence: 'low' })

    const result = await identifyBookFromCover(jpegBuffer, 'image/jpeg')

    expect(result.draft).toEqual({ status: 'to read' })
    expect(result.warnings).toEqual([
      'Couldn\'t make out a title or author from that photo. Try a clearer, well-lit shot, or fill in the details manually.'
    ])
    expect(mockedLookup).not.toHaveBeenCalled()
  })

  it('warns on low confidence but still looks up metadata', async () => {
    mockedVision.mockResolvedValue({
      title: 'The Left Hand of Darkness',
      author: 'Ursula K. Le Guin',
      confidence: 'low'
    })
    mockedLookup.mockResolvedValue(null)

    const result = await identifyBookFromCover(jpegBuffer, 'image/jpeg')

    expect(mockedLookup).toHaveBeenCalledWith({
      title: 'The Left Hand of Darkness',
      author: 'Ursula K. Le Guin'
    })
    expect(result.draft).toEqual({
      title: 'The Left Hand of Darkness',
      author: 'Ursula K. Le Guin',
      status: 'to read',
      coverImageUri: undefined
    })
    expect(result.warnings).toContain('Low confidence match — please double check the details below.')
    expect(result.warnings).toContain(
      'Identified a possible match from the photo, but couldn\'t verify it against Open Library — please double check the details below.'
    )
  })

  it('prefers Open Library title, author, and cover when lookup succeeds', async () => {
    mockedVision.mockResolvedValue({
      title: 'Left Hand of Darkness',
      author: 'Le Guin',
      confidence: 'high'
    })
    mockedLookup.mockResolvedValue({
      title: 'The Left Hand of Darkness',
      author: 'Ursula K. Le Guin',
      coverImageUri: 'https://covers.openlibrary.org/b/id/123-L.jpg',
      publishedYear: 1969
    })

    const result = await identifyBookFromCover(jpegBuffer, 'image/jpeg')

    expect(result.draft).toEqual({
      title: 'The Left Hand of Darkness',
      author: 'Ursula K. Le Guin',
      status: 'to read',
      coverImageUri: 'https://covers.openlibrary.org/b/id/123-L.jpg'
    })
    expect(result.warnings).toEqual([])
  })

  it('keeps vision fields and warns when Open Library misses', async () => {
    mockedVision.mockResolvedValue({
      title: 'Neuromancer',
      author: 'William Gibson',
      confidence: 'medium'
    })
    mockedLookup.mockResolvedValue(null)

    const result = await identifyBookFromCover(jpegBuffer, 'image/jpeg')

    expect(result.draft).toEqual({
      title: 'Neuromancer',
      author: 'William Gibson',
      status: 'to read',
      coverImageUri: undefined
    })
    expect(result.warnings).toEqual([
      'Identified a possible match from the photo, but couldn\'t verify it against Open Library — please double check the details below.'
    ])
  })

  it('returns an enriched draft on the happy path', async () => {
    mockedVision.mockResolvedValue({
      title: 'Dune',
      author: 'Frank Herbert',
      confidence: 'medium'
    })
    mockedLookup.mockResolvedValue({
      title: 'Dune',
      author: 'Frank Herbert',
      coverImageUri: 'https://covers.openlibrary.org/b/id/456-L.jpg'
    })

    const result = await identifyBookFromCover(jpegBuffer, 'image/jpeg', 'dune.jpg')

    expect(mockedConvert).toHaveBeenCalledWith({
      buffer: jpegBuffer,
      mimeType: 'image/jpeg',
      originalName: 'dune.jpg'
    })
    expect(result).toEqual({
      draft: {
        title: 'Dune',
        author: 'Frank Herbert',
        status: 'to read',
        coverImageUri: 'https://covers.openlibrary.org/b/id/456-L.jpg'
      },
      warnings: []
    })
  })
})
