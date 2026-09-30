import type { Request, Response } from 'express'

export function notFoundHandler (_req: Request, res: Response): void {
  res.status(404).render('error', { statusCode: 404, message: 'Page not found' })
}
