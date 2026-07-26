import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'

const app = createApp()

const sampleBook = {
  title: 'The Left Hand of Darkness',
  author: 'Ursula K. Le Guin',
  status: 'to read'
}

describe('GET /api/books', () => {
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
})

describe('GET /api/books/:id', () => {
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
})

describe('PUT /api/books/:id', () => {
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
})

describe('PATCH /api/books/:id', () => {
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
})

describe('DELETE /api/books/:id', () => {
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
})
