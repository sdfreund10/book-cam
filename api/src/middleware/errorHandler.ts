import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'

interface HttpError extends Error {
  statusCode?: number
  details?: unknown
}

function describeMulterError (err: multer.MulterError): string {
  if (err.code === 'LIMIT_FILE_SIZE') return 'That image is too large (max 8MB).'
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return 'Please upload an image file.'
  return 'There was a problem with the uploaded file.'
}

export function errorHandler (err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const httpError: HttpError =
    err instanceof multer.MulterError
      ? Object.assign(new Error(describeMulterError(err)), { statusCode: 400 })
      : err instanceof Error
        ? err
        : new Error('Internal server error')

  const statusCode = httpError.statusCode ?? 500
  const message = statusCode < 500 ? httpError.message : 'Internal server error'

  if (statusCode >= 500) {
    console.error(httpError)
  }

  if (req.path.startsWith('/api/')) {
    res.status(statusCode).json({ error: message, details: httpError.details })
    return
  }

  res.status(statusCode).render('error', { statusCode, message })
}
