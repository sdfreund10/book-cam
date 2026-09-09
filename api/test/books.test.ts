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

describe('GET /api/books', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('returns an empty list when there are no books', async () => {
    const res = await request(app).get('/api/books')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: [] })
  })

  it('returns created books', async () => {
    await request(app).post('/api/books').send(sampleBook)

    const res = await request(app).get('/api/books')

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject(sampleBook)
  })
})

describe('POST /api/books', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('creates a book', async () => {
    const res = await request(app).post('/api/books').send(sampleBook)

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject(sampleBook)
    expect(typeof res.body.data.id).toBe('number')
  })

  it('rejects invalid book data', async () => {
    const res = await request(app).post('/api/books').send({ title: 'Missing author' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid book data')
    expect(res.body.details).toMatchObject({
      author: 'Author is required',
      status: 'Status is required'
    })
  })

  it('enriches a missing cover from Open Library', async () => {
    mockedLookup.mockResolvedValue({
      title: sampleBook.title,
      author: sampleBook.author,
      coverImageUri: 'https://covers.openlibrary.org/b/id/123-L.jpg'
    })

    const res = await request(app).post('/api/books').send(sampleBook)

    expect(res.status).toBe(201)
    expect(res.body.data.coverImageUri).toBe('https://covers.openlibrary.org/b/id/123-L.jpg')
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

    const res = await request(app).post('/api/books').send(withCover)

    expect(res.status).toBe(201)
    expect(res.body.data.coverImageUri).toBe('https://example.com/my-cover.jpg')
    expect(mockedLookup).not.toHaveBeenCalled()
  })

  it('creates a book without a cover when lookup returns null', async () => {
    mockedLookup.mockResolvedValue(null)

    const res = await request(app).post('/api/books').send(sampleBook)

    expect(res.status).toBe(201)
    expect(res.body.data.coverImageUri).toBeNull()
    expect(mockedLookup).toHaveBeenCalledOnce()
  })

  it('persists optional notes and coverImageUri', async () => {
    const res = await request(app).post('/api/books').send({
      ...sampleBook,
      notes: 'Gift from Alex',
      coverImageUri: 'https://example.com/cover.jpg'
    })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      ...sampleBook,
      notes: 'Gift from Alex',
      coverImageUri: 'https://example.com/cover.jpg'
    })
  })
})

describe('GET /api/books/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('returns a book by id', async () => {
    const created = await request(app).post('/api/books').send(sampleBook)
    const id = created.body.data.id as number

    const res = await request(app).get(`/api/books/${id}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id, ...sampleBook })
  })

  it('returns 404 for a missing book', async () => {
    const res = await request(app).get('/api/books/999999')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Book not found')
  })

  it.each(['abc', '0', '-1'])('returns 404 for invalid id %s', async (id) => {
    const res = await request(app).get(`/api/books/${id}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Book not found')
  })
})

describe('PUT /api/books/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('replaces a book', async () => {
    const created = await request(app).post('/api/books').send(sampleBook)
    const id = created.body.data.id as number

    const updated = {
      title: 'A Wizard of Earthsea',
      author: 'Ursula K. Le Guin',
      status: 'finished'
    }

    const res = await request(app).put(`/api/books/${id}`).send(updated)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id, ...updated })
  })

  it('returns 404 when replacing a missing book', async () => {
    const res = await request(app).put('/api/books/999999').send(sampleBook)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Book not found')
  })

  it('returns 400 for invalid replacement data', async () => {
    const created = await request(app).post('/api/books').send(sampleBook)
    const id = created.body.data.id as number

    const res = await request(app).put(`/api/books/${id}`).send({ title: 'Only title' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid book data')
    expect(res.body.details).toMatchObject({
      author: 'Author is required',
      status: 'Status is required'
    })
  })

  it.each(['abc', '0', '-1'])('returns 404 for invalid id %s', async (id) => {
    const res = await request(app).put(`/api/books/${id}`).send(sampleBook)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Book not found')
  })
})

describe('PATCH /api/books/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('partially updates a book', async () => {
    const created = await request(app).post('/api/books').send(sampleBook)
    const id = created.body.data.id as number

    const res = await request(app).patch(`/api/books/${id}`).send({ status: 'started' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({
      id,
      title: sampleBook.title,
      author: sampleBook.author,
      status: 'started'
    })
  })

  it('returns 404 when patching a missing book', async () => {
    const res = await request(app).patch('/api/books/999999').send({ status: 'started' })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Book not found')
  })

  it('returns 400 for an invalid status', async () => {
    const created = await request(app).post('/api/books').send(sampleBook)
    const id = created.body.data.id as number

    const res = await request(app).patch(`/api/books/${id}`).send({ status: 'reading' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid book data')
    expect(res.body.details.status).toMatch(/Status must be one of/)
  })

  it.each(['abc', '0', '-1'])('returns 404 for invalid id %s', async (id) => {
    const res = await request(app).patch(`/api/books/${id}`).send({ status: 'started' })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Book not found')
  })
})

describe('DELETE /api/books/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedLookup.mockResolvedValue(null)
  })

  it('deletes a book', async () => {
    const created = await request(app).post('/api/books').send(sampleBook)
    const id = created.body.data.id as number

    const res = await request(app).delete(`/api/books/${id}`)

    expect(res.status).toBe(204)

    const missing = await request(app).get(`/api/books/${id}`)
    expect(missing.status).toBe(404)
  })

  it('returns 404 when deleting a missing book', async () => {
    const res = await request(app).delete('/api/books/999999')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Book not found')
  })

  it.each(['abc', '0', '-1'])('returns 404 for invalid id %s', async (id) => {
    const res = await request(app).delete(`/api/books/${id}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Book not found')
  })
})
