import type { NextFunction, Request, Response } from 'express'

import { isAuthenticated } from '../auth/session.js'

export function requireAuth (req: Request, res: Response, next: NextFunction): void {
  if (isAuthenticated(req)) {
    next()
    return
  }

  if (wantsJson(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const nextPath = encodeURIComponent(req.originalUrl)
  res.redirect(`/login?next=${nextPath}`)
}

function wantsJson (req: Request): boolean {
  if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) return true
  const accept = req.get('accept') ?? ''
  return accept.includes('application/json') && !accept.includes('text/html')
}
