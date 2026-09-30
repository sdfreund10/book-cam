import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/services/identifyBookFromCover.js', () => ({
  identifyBookFromCover: vi.fn()
}))

const { identifyBookFromCover } = await import('../src/services/identifyBookFromCover.js')
const { createApp } = await import('../src/app.js')
const { authed } = await import('./helpers/authed.js')

const mockedIdentify = vi.mocked(identifyBookFromCover)
const app = createApp()
const request = authed(app)

const tinyJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
  'base64'
)

describe('POST /books/scan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedIdentify.mockResolvedValue({
      draft: {
        title: 'Dune',
        author: 'Frank Herbert',
        status: 'to read',
        coverImageUri: 'https://covers.openlibrary.org/b/id/456-L.jpg'
      },
      warnings: []
    })
  })

  it('returns 400 when the cover field is missing', async () => {
    const res = await request.post('/books/scan')

    expect(res.status).toBe(400)
    expect(res.text).toContain('Please choose a photo of a book cover to scan.')
    expect(mockedIdentify).not.toHaveBeenCalled()
  })

  it('returns 400 when the upload is not an image', async () => {
    const res = await request
      .post('/books/scan')
      .attach('cover', Buffer.from('not-an-image'), {
        filename: 'notes.txt',
        contentType: 'text/plain'
      })

    expect(res.status).toBe(400)
    expect(res.text).toContain('Please upload an image file.')
    expect(mockedIdentify).not.toHaveBeenCalled()
  })

  it('returns 400 when the wrong field name is used', async () => {
    const res = await request
      .post('/books/scan')
      .attach('photo', tinyJpeg, {
        filename: 'cover.jpg',
        contentType: 'image/jpeg'
      })

    expect(res.status).toBe(400)
    // Multer rejects unexpected fields before the missing-cover check runs.
    expect(res.text).toContain('Please upload an image file.')
    expect(mockedIdentify).not.toHaveBeenCalled()
  })

  it('pre-fills the new-book form for a valid JPEG', async () => {
    const res = await request
      .post('/books/scan')
      .attach('cover', tinyJpeg, {
        filename: 'cover.jpg',
        contentType: 'image/jpeg'
      })

    expect(res.status).toBe(200)
    expect(res.text).toContain('value="Dune"')
    expect(res.text).toContain('value="Frank Herbert"')
    expect(res.text).toContain('https://covers.openlibrary.org/b/id/456-L.jpg')
    expect(mockedIdentify).toHaveBeenCalledOnce()
    expect(mockedIdentify.mock.calls[0]?.[1]).toBe('image/jpeg')
    expect(mockedIdentify.mock.calls[0]?.[2]).toBe('cover.jpg')
  })

  it('returns 400 when the image exceeds 8MB', async () => {
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1, 0xff)

    const res = await request
      .post('/books/scan')
      .attach('cover', oversized, {
        filename: 'huge.jpg',
        contentType: 'image/jpeg'
      })

    expect(res.status).toBe(400)
    expect(res.text).toContain('That image is too large (max 8MB).')
    expect(mockedIdentify).not.toHaveBeenCalled()
  })
})
