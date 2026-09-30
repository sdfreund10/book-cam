import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

vi.mock('../src/services/bookLookupService.js', () => ({
  lookupBookMetadata: vi.fn()
}))

const { lookupBookMetadata } = await import('../src/services/bookLookupService.js')
const { createApp } = await import('../src/app.js')

const mockedLookup = vi.mocked(lookupBookMetadata)
const app = createApp()

const sampleBook = {
  title: 'The Left Hand of Darkness',
  author: 'Ursula K. Le Guin',
  status: 'to read'
}

function bookIdFromRedirect (location: string | undefined): number {
  const match = location?.match(/^\/books\/(\d+)$/)
  expect(match).not.toBeNull()
  return Number(match?.[1])
}

async function postBook (fields: Record<string, string> = sampleBook): Promise<request.Response> {
  return await request(app).post('/books').type('form').send(fields)
}

describe('GET /books', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('shows an empty list when there are no books', async () => {
    const res = await request(app).get('/books')

    expect(res.status).toBe(200)
    expect(res.text).toContain('No books yet')
  })

  it('lists created books', async () => {
    await postBook()

    const res = await request(app).get('/books')

    expect(res.status).toBe(200)
    expect(res.text).toContain(sampleBook.title)
    expect(res.text).toContain(sampleBook.author)
  })
})

describe('POST /books', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('creates a book and redirects to it', async () => {
    const res = await postBook()

    expect(res.status).toBe(302)
    const id = bookIdFromRedirect(res.headers.location)

    const show = await request(app).get(`/books/${id}`)
    expect(show.status).toBe(200)
    expect(show.text).toContain(sampleBook.title)
    expect(show.text).toContain(sampleBook.author)
  })

  it('rejects invalid book data', async () => {
    const res = await request(app).post('/books').type('form').send({ title: 'Missing author' })

    expect(res.status).toBe(400)
    expect(res.text).toContain('Author is required')
    expect(res.text).toContain('Status is required')
  })

  it('enriches a missing cover from Open Library', async () => {
    mockedLookup.mockResolvedValue({
      title: sampleBook.title,
      author: sampleBook.author,
      coverImageUri: 'https://covers.openlibrary.org/b/id/123-L.jpg'
    })

    const res = await postBook()
    const id = bookIdFromRedirect(res.headers.location)

    const show = await request(app).get(`/books/${id}`)
    expect(show.text).toContain('https://covers.openlibrary.org/b/id/123-L.jpg')
    expect(mockedLookup).toHaveBeenCalledWith({
      title: sampleBook.title,
      author: sampleBook.author
    })
  })

  it('keeps an existing coverImageUri without looking up a replacement', async () => {
    const withCover = {
      ...sampleBook,
      coverImageUri: 'https://example.com/my-cover.jpg'
    }

    const res = await postBook(withCover)
    const id = bookIdFromRedirect(res.headers.location)

    const show = await request(app).get(`/books/${id}`)
    expect(show.text).toContain('https://example.com/my-cover.jpg')
    expect(mockedLookup).not.toHaveBeenCalled()
  })

  it('creates a book without a cover when lookup returns null', async () => {
    mockedLookup.mockResolvedValue(null)

    const res = await postBook()
    const id = bookIdFromRedirect(res.headers.location)

    const show = await request(app).get(`/books/${id}`)
    expect(show.text).not.toContain('alt="Cover of')
    expect(mockedLookup).toHaveBeenCalledOnce()
  })

  it('persists optional notes and coverImageUri', async () => {
    const res = await postBook({
      ...sampleBook,
      notes: 'Gift from Alex',
      coverImageUri: 'https://example.com/cover.jpg'
    })
    const id = bookIdFromRedirect(res.headers.location)

    const show = await request(app).get(`/books/${id}`)
    expect(show.text).toContain('Gift from Alex')
    expect(show.text).toContain('https://example.com/cover.jpg')
  })
})

describe('GET /books/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('shows a book by id', async () => {
    const created = await postBook()
    const id = bookIdFromRedirect(created.headers.location)

    const res = await request(app).get(`/books/${id}`)

    expect(res.status).toBe(200)
    expect(res.text).toContain(sampleBook.title)
    expect(res.text).toContain(sampleBook.author)
  })

  it('returns 404 for a missing book', async () => {
    const res = await request(app).get('/books/999999')

    expect(res.status).toBe(404)
    expect(res.text).toContain('Book not found')
  })

  it.each(['abc', '0', '-1'])('returns 404 for invalid id %s', async (id) => {
    const res = await request(app).get(`/books/${id}`)

    expect(res.status).toBe(404)
    expect(res.text).toContain('Book not found')
  })
})

describe('POST /books/:id/edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('updates a book', async () => {
    const created = await postBook()
    const id = bookIdFromRedirect(created.headers.location)

    const updated = {
      title: 'A Wizard of Earthsea',
      author: 'Ursula K. Le Guin',
      status: 'finished'
    }

    const res = await request(app).post(`/books/${id}/edit`).type('form').send(updated)

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe(`/books/${id}`)

    const show = await request(app).get(`/books/${id}`)
    expect(show.text).toContain(updated.title)
    expect(show.text).toContain('finished')
  })

  it('returns 404 when editing a missing book', async () => {
    const res = await request(app).post('/books/999999/edit').type('form').send(sampleBook)

    expect(res.status).toBe(404)
    expect(res.text).toContain('Book not found')
  })

  it('returns 400 for invalid replacement data', async () => {
    const created = await postBook()
    const id = bookIdFromRedirect(created.headers.location)

    const res = await request(app).post(`/books/${id}/edit`).type('form').send({ title: 'Only title' })

    expect(res.status).toBe(400)
    expect(res.text).toContain('Author is required')
    expect(res.text).toContain('Status is required')
  })

  it('returns 400 for an invalid status', async () => {
    const created = await postBook()
    const id = bookIdFromRedirect(created.headers.location)

    const res = await request(app).post(`/books/${id}/edit`).type('form').send({
      ...sampleBook,
      status: 'reading'
    })

    expect(res.status).toBe(400)
    expect(res.text).toMatch(/Status must be one of/)
  })

  it.each(['abc', '0', '-1'])('returns 404 for invalid id %s', async (id) => {
    const res = await request(app).post(`/books/${id}/edit`).type('form').send(sampleBook)

    expect(res.status).toBe(404)
    expect(res.text).toContain('Book not found')
  })
})

describe('POST /books/:id/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('deletes a book', async () => {
    const created = await postBook()
    const id = bookIdFromRedirect(created.headers.location)

    const res = await request(app).post(`/books/${id}/delete`)

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/books')

    const missing = await request(app).get(`/books/${id}`)
    expect(missing.status).toBe(404)
  })

  it('returns 404 when deleting a missing book', async () => {
    const res = await request(app).post('/books/999999/delete')

    expect(res.status).toBe(404)
    expect(res.text).toContain('Book not found')
  })

  it.each(['abc', '0', '-1'])('returns 404 for invalid id %s', async (id) => {
    const res = await request(app).post(`/books/${id}/delete`)

    expect(res.status).toBe(404)
    expect(res.text).toContain('Book not found')
  })
})

describe('removed JSON API', () => {
  it('does not serve /api/books', async () => {
    const res = await request(app).get('/api/books')

    expect(res.status).toBe(404)
    expect(res.text).toContain('Page not found')
  })
})
