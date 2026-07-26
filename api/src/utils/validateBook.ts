import { BOOK_STATUSES, type BookDraft, type BookStatus } from '../types/book.js'

function cleanString (value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isBookStatus (value: string): value is BookStatus {
  return (BOOK_STATUSES as readonly string[]).includes(value)
}

export interface BookValidationErrors {
  title?: string
  author?: string
  status?: string
}

export interface BookValidationResult {
  data: Partial<BookDraft>
  errors: BookValidationErrors
  isValid: boolean
}

export interface ValidateBookOptions {
  partial?: boolean
}

/**
 * Validates book input from either a JSON body or an HTML form submission.
 * When `partial` is true, missing fields are simply omitted from the result
 * instead of raising an error (used for PATCH-style updates).
 */
export function validateBook (
  input: Record<string, unknown> = {},
  { partial = false }: ValidateBookOptions = {}
): BookValidationResult {
  const errors: BookValidationErrors = {}
  const data: Partial<BookDraft> = {}

  const title = cleanString(input.title)
  if (title !== undefined) {
    data.title = title
  } else if (!partial) {
    errors.title = 'Title is required'
  }

  const author = cleanString(input.author)
  if (author !== undefined) {
    data.author = author
  } else if (!partial) {
    errors.author = 'Author is required'
  }

  if (input.status !== undefined || !partial) {
    const status = cleanString(input.status)
    if (status === undefined) {
      errors.status = 'Status is required'
    } else if (!isBookStatus(status)) {
      errors.status = `Status must be one of: ${BOOK_STATUSES.join(', ')}`
    } else {
      data.status = status
    }
  }

  if (input.coverImageUri !== undefined) {
    data.coverImageUri = cleanString(input.coverImageUri)
  }

  if (input.notes !== undefined) {
    data.notes = cleanString(input.notes)
  }

  return { data, errors, isValid: Object.keys(errors).length === 0 }
}
