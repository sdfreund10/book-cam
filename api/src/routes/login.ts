import { Router } from 'express'

import {
  isAuthenticated,
  passwordsMatch,
  safeNextPath,
  sessionToken,
  setSessionCookie
} from '../auth/session.js'

export const loginRouter = Router()

loginRouter.get('/', (req, res) => {
  if (isAuthenticated(req)) {
    res.redirect(safeNextPath(req.query.next))
    return
  }

  res.render('login', {
    error: null,
    next: safeNextPath(req.query.next)
  })
})

loginRouter.post('/', (req, res) => {
  const nextPath = safeNextPath(req.body?.next ?? req.query.next)
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  if (!passwordsMatch(password)) {
    res.status(401).render('login', {
      error: 'That password is incorrect.',
      next: nextPath
    })
    return
  }

  const token = sessionToken()
  setSessionCookie(req, res, token)
  res.redirect(nextPath)
})
