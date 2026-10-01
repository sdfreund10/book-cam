import { Router } from 'express'

import { isLoginRateLimited, recordFailedLogin } from '../auth/loginRateLimit.js'
import {
  isAuthenticated,
  passwordsMatch,
  safeNextPath,
  setSessionCookie
} from '../auth/session.js'
import { requireHttpsInProduction } from '../middleware/requireHttps.js'

export const loginRouter = Router()

loginRouter.use(requireHttpsInProduction)

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

  if (isLoginRateLimited(req)) {
    res.status(429).render('login', {
      error: 'Too many sign-in attempts. Try again in a few minutes.',
      next: nextPath
    })
    return
  }

  if (!passwordsMatch(password)) {
    recordFailedLogin(req)
    res.status(401).render('login', {
      error: 'That password is incorrect.',
      next: nextPath
    })
    return
  }

  setSessionCookie(req, res)
  res.redirect(nextPath)
})
