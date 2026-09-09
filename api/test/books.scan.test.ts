import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('../src/services/identifyBookFromCover.js', () => ({
  identifyBookFromCover: vi.fn()
}))

const { identifyBookFromCover } = await import('../src/services/identifyBookFromCover.js')
const { createApp } = await import('../src/app.js')

const mockedIdentify = vi.mocked(identifyBookFromCover)
const app = createApp()

const tinyJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
  'base64'
)

describe('POST /api/books/scan', () => {
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
    const res = await request(app).post('/api/books/scan')

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('A cover image file is required (field name "cover")')
    expect(mockedIdentify).not.toHaveBeenCalled()
  })

  it('returns 400 when the upload is not an image', async () => {
    const res = await request(app)
      .post('/api/books/scan')
      .attach('cover', Buffer.from('not-an-image'), {
        filename: 'notes.txt',
        contentType: 'text/plain'
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Please upload an image file.')
    expect(mockedIdentify).not.toHaveBeenCalled()
  })

  it('returns 400 when the wrong field name is used', async () => {
    const res = await request(app)
      .post('/api/books/scan')
      .attach('photo', tinyJpeg, {
        filename: 'cover.jpg',
        contentType: 'image/jpeg'
      })

    expect(res.status).toBe(400)
    // Multer rejects unexpected fields before the missing-cover check runs.
    expect(res.body.error).toBe('Please upload an image file.')
    expect(mockedIdentify).not.toHaveBeenCalled()
  })

  it('returns a draft and warnings for a valid JPEG', async () => {
    const res = await request(app)
      .post('/api/books/scan')
      .attach('cover', tinyJpeg, {
        filename: 'cover.jpg',
        contentType: 'image/jpeg'
      })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      data: {
        title: 'Dune',
        author: 'Frank Herbert',
        status: 'to read',
        coverImageUri: 'https://covers.openlibrary.org/b/id/456-L.jpg'
      },
      warnings: []
    })
    expect(mockedIdentify).toHaveBeenCalledOnce()
    expect(mockedIdentify.mock.calls[0]?.[1]).toBe('image/jpeg')
    expect(mockedIdentify.mock.calls[0]?.[2]).toBe('cover.jpg')
  })

  it('returns 400 when the image exceeds 8MB', async () => {
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1, 0xff)

    const res = await request(app)
      .post('/api/books/scan')
      .attach('cover', oversized, {
        filename: 'huge.jpg',
        contentType: 'image/jpeg'
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('That image is too large (max 8MB).')
    expect(mockedIdentify).not.toHaveBeenCalled()
  })
})
