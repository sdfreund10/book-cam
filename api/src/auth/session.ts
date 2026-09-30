import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import type { Request, Response } from 'express'

export const SESSION_COOKIE = 'book_camera_session'
const SESSION_PURPOSE = 'book-camera-session-v1'
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000

export function appPassword (): string {
  return process.env.APP_PASSWORD ?? ''
}

export function isAuthConfigured (): boolean {
  return appPassword() !== ''
}

export function sessionToken (password = appPassword()): string {
  return createHmac('sha256', password).update(SESSION_PURPOSE).digest('hex')
}

export function passwordsMatch (candidate: string): boolean {
  const expected = appPassword()
  if (expected === '' || candidate === '') return false
  return secretEqual(candidate, expected)
}

export function tokensMatch (candidate: string): boolean {
  if (!isAuthConfigured() || candidate === '') return false
  return secretEqual(candidate, sessionToken())
}

export function isAuthenticated (req: Request): boolean {
  if (!isAuthConfigured()) return false

  const cookie = cookieValue(req, SESSION_COOKIE)
  return cookie != null && tokensMatch(cookie)
}

export function setSessionCookie (req: Request, res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(req),
    maxAge: TEN_YEARS_MS,
    path: '/'
  })
}

export function safeNextPath (raw: unknown): string {
  if (typeof raw !== 'string') return '/books'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/books'
  return raw
}

function secretEqual (a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest()
  const right = createHash('sha256').update(b).digest()
  return timingSafeEqual(left, right)
}

function isSecureRequest (req: Request): boolean {
  return req.secure || req.get('x-forwarded-proto') === 'https'
}

function cookieValue (req: Request, name: string): string | undefined {
  const header = req.headers.cookie
  if (header == null || header === '') return undefined

  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq) !== name) continue
    try {
      return decodeURIComponent(trimmed.slice(eq + 1))
    } catch {
      return trimmed.slice(eq + 1)
    }
  }

  return undefined
}
