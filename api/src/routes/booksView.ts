import { Router } from 'express'

import { createBook, deleteBook, getBook, listBooks, updateBook } from '../data/books.js'
import { uploadCoverImage } from '../middleware/upload.js'
import { addCoverImage } from '../services/booksService.js'
import { identifyBookFromCover } from '../services/identifyBookFromCover.js'
import type { BookDraft } from '../types/book.js'
import { ApiError } from '../utils/ApiError.js'
import { validateBook } from '../utils/validateBook.js'

export const booksViewRouter = Router()

function parseBookId (raw: string): number | undefined {
  const id = Number.parseInt(raw, 10)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

booksViewRouter.get('/', async (_req, res, next) => {
  try {
    console.log('Listing books')
    const books = await listBooks()
    console.log('Books:', books)
    res.render('books/index', { books })
  } catch (err) {
    next(err)
  }
})

booksViewRouter.get('/new', (_req, res) => {
  res.render('books/new', { book: {}, errors: {}, warnings: [] })
})

booksViewRouter.get('/scan', (_req, res) => {
  res.render('books/scan', { warnings: [] })
})

booksViewRouter.post('/scan', uploadCoverImage, (req, res, next) => {
  if (req.file == null) {
    return res.status(400).render('books/scan', { warnings: ['Please choose a photo of a book cover to scan.'] })
  }

  identifyBookFromCover(req.file.buffer, req.file.mimetype, req.file.originalname)
    .then(({ draft, warnings }) => {
      res.render('books/new', { book: draft, errors: {}, warnings })
    })
    .catch(next)
})

booksViewRouter.post('/', async (req, res, next) => {
  try {
    const { data, errors, isValid } = validateBook(req.body)
    if (!isValid) {
      return res.status(400).render('books/new', { book: req.body, errors })
    }

    const created = await createBook(data as BookDraft)
    const book = await addCoverImage(created)

    res.redirect(`/books/${book.id}`)
  } catch (err) {
    next(err)
  }
})

booksViewRouter.get('/:id', async (req, res, next) => {
  const bookId = parseBookId(req.params.id)
  if (bookId == null) return next(ApiError.notFound('Book not found'))

  const book = await getBook(bookId)
  if (book == null) return next(ApiError.notFound('Book not found'))

  res.render('books/show', { book })
})

booksViewRouter.get('/:id/edit', async (req, res, next) => {
  const bookId = parseBookId(req.params.id)
  if (bookId == null) return next(ApiError.notFound('Book not found'))

  const book = await getBook(bookId)
  if (book == null) return next(ApiError.notFound('Book not found'))

  res.render('books/edit', { book, errors: {} })
})

booksViewRouter.post('/:id/edit', async (req, res, next) => {
  const bookId = parseBookId(req.params.id)
  if (bookId == null) return next(ApiError.notFound('Book not found'))

  const existing = await getBook(bookId)
  if (existing == null) return next(ApiError.notFound('Book not found'))

  const { data, errors, isValid } = validateBook(req.body)
  if (!isValid) {
    return res.status(400).render('books/edit', { book: { ...req.body, id: existing.id }, errors })
  }

  await updateBook(bookId, data)
  res.redirect(`/books/${existing.id}`)
})

booksViewRouter.post('/:id/delete', async (req, res, next) => {
  const bookId = parseBookId(req.params.id)
  if (bookId == null) return next(ApiError.notFound('Book not found'))

  const wasDeleted = await deleteBook(bookId)
  if (!wasDeleted) return next(ApiError.notFound('Book not found'))

  res.redirect('/books')
})
