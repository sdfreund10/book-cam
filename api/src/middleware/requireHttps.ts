import type { NextFunction, Request, Response } from 'express'

import { isSecureRequest } from '../auth/session.js'

export function requireHttpsInProduction (req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== 'production' || isSecureRequest(req)) {
    next()
    return
  }

  const host = req.get('host')
  if (host == null || host === '') {
    res.status(400).send('HTTPS is required')
    return
  }

  res.redirect(308, `https://${host}${req.originalUrl}`)
}
