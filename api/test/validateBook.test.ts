import { describe, expect, it } from 'vitest'

import { BOOK_STATUSES } from '../src/types/book.js'
import { validateBook } from '../src/utils/validateBook.js'

describe('validateBook', () => {
  it('accepts a complete valid book', () => {
    const result = validateBook({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'to read'
    })

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
    expect(result.data).toEqual({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'to read'
    })
  })

  it('rejects an invalid status with the allowed list', () => {
    const result = validateBook({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'reading'
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.status).toBe(`Status must be one of: ${BOOK_STATUSES.join(', ')}`)
  })

  it('treats whitespace-only title and author as missing', () => {
    const result = validateBook({
      title: '   ',
      author: '\t',
      status: 'owned'
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual({
      title: 'Title is required',
      author: 'Author is required'
    })
    expect(result.data).toEqual({ status: 'owned' })
  })

  it('omits missing fields in partial mode', () => {
    const result = validateBook({ notes: 'halfway through' }, { partial: true })

    expect(result.isValid).toBe(true)
    expect(result.data).toEqual({ notes: 'halfway through' })
    expect(result.errors).toEqual({})
  })

  it('rejects a bad status in partial mode when status is present', () => {
    const result = validateBook({ status: 'nope' }, { partial: true })

    expect(result.isValid).toBe(false)
    expect(result.errors.status).toBe(`Status must be one of: ${BOOK_STATUSES.join(', ')}`)
  })

  it('cleans blank notes and coverImageUri to undefined', () => {
    const result = validateBook({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'finished',
      notes: '   ',
      coverImageUri: ''
    })

    expect(result.isValid).toBe(true)
    expect(result.data).toEqual({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'finished',
      notes: undefined,
      coverImageUri: undefined
    })
  })

  it('trims string fields', () => {
    const result = validateBook({
      title: '  Dune  ',
      author: ' Frank Herbert ',
      status: 'started',
      notes: '  margin notes ',
      coverImageUri: ' https://example.com/cover.jpg '
    })

    expect(result.isValid).toBe(true)
    expect(result.data).toEqual({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'started',
      notes: 'margin notes',
      coverImageUri: 'https://example.com/cover.jpg'
    })
  })
})
