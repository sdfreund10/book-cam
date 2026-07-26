import type { Request, Response } from 'express'

export function notFoundHandler (req: Request, res: Response): void {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  res.status(404).render('error', { statusCode: 404, message: 'Page not found' })
}
