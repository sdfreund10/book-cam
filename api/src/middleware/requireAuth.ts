import type { NextFunction, Request, Response } from 'express'

import { isAuthenticated } from '../auth/session.js'

export function requireAuth (req: Request, res: Response, next: NextFunction): void {
  if (isAuthenticated(req)) {
    next()
    return
  }

  const nextPath = encodeURIComponent(req.originalUrl)
  res.redirect(`/login?next=${nextPath}`)
}
