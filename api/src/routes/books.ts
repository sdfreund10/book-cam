import { Router } from 'express'

import { createBook, deleteBook, getBook, listBooks, updateBook } from '../data/books.js'
import { uploadCoverImage } from '../middleware/upload.js'
import { identifyBookFromCover } from '../services/identifyBookFromCover.js'
import { addCoverImage } from '../services/booksService.js'
import type { BookDraft } from '../types/book.js'
import { ApiError } from '../utils/ApiError.js'
import { validateBook } from '../utils/validateBook.js'

export const booksRouter = Router()

function parseBookId (raw: string): number | undefined {
  const id = Number.parseInt(raw, 10)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

booksRouter.get('/', async (_req, res, next) => {
  try {
    res.json({ data: await listBooks() })
  } catch (err) {
    next(err)
  }
})

// Scan a cover photo and get back a best-effort book draft (title/author/cover)
// to pre-fill a "new book" form with. Does not create a book.
booksRouter.post('/scan', uploadCoverImage, (req, res, next) => {
  if (req.file == null) return next(ApiError.badRequest('A cover image file is required (field name "cover")'))

  identifyBookFromCover(req.file.buffer, req.file.mimetype, req.file.originalname)
    .then(({ draft, warnings }) => res.json({ data: draft, warnings }))
    .catch(next)
})

booksRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseBookId(req.params.id)
    if (id == null) return next(ApiError.notFound('Book not found'))

    const book = await getBook(id)
    if (book == null) return next(ApiError.notFound('Book not found'))

    res.json({ data: book })
  } catch (err) {
    next(err)
  }
})

booksRouter.post('/', async (req, res, next) => {
  try {
    const { data, errors, isValid } = validateBook(req.body)
    if (!isValid) return next(ApiError.badRequest('Invalid book data', errors))

    const created = await createBook(data as BookDraft)
    const book = await addCoverImage(created)
    res.status(201).json({ data: book })
  } catch (err) {
    next(err)
  }
})

// PUT and PATCH are identical for books -- combine
booksRouter.put('/:id', async (req, res, next) => {
  try {
    const id = parseBookId(req.params.id)
    if (id == null) return next(ApiError.notFound('Book not found'))
    if (await getBook(id) == null) return next(ApiError.notFound('Book not found'))

    const { data, errors, isValid } = validateBook(req.body)
    if (!isValid) return next(ApiError.badRequest('Invalid book data', errors))

    const book = await updateBook(id, data)
    // TODO: If author or title changed, attempt to update the cover image
    res.json({ data: book })
  } catch (err) {
    next(err)
  }
})

booksRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = parseBookId(req.params.id)
    if (id == null) return next(ApiError.notFound('Book not found'))
    if (await getBook(id) == null) return next(ApiError.notFound('Book not found'))

    const { data, errors, isValid } = validateBook(req.body, { partial: true })
    if (!isValid) return next(ApiError.badRequest('Invalid book data', errors))

    const book = await updateBook(id, data)
    // TODO: If author or title changed, attempt to update the cover image
    res.json({ data: book })
  } catch (err) {
    next(err)
  }
})

booksRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = parseBookId(req.params.id)
    if (id == null) return next(ApiError.notFound('Book not found'))

    const wasDeleted = await deleteBook(id)
    if (!wasDeleted) return next(ApiError.notFound('Book not found'))

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})
