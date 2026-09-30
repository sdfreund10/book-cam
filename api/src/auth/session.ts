import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import type { Request, Response } from 'express'

export const SESSION_COOKIE = 'book_camera_session'
const SESSION_PURPOSE = 'book-camera-session-v1'
const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000

export function sessionToken (): string {
  return createHmac('sha256', appPassword()).update(SESSION_PURPOSE).digest('hex')
}

export function passwordsMatch (candidate: string): boolean {
  const expected = appPassword()
  if (expected === '' || candidate === '') return false
  return secretEqual(candidate, expected)
}

export function isAuthenticated (req: Request): boolean {
  if (appPassword() === '') return false

  const cookie = cookieValue(req)
  return cookie != null && cookie !== '' && secretEqual(cookie, sessionToken())
}

export function setSessionCookie (req: Request, res: Response): void {
  res.cookie(SESSION_COOKIE, sessionToken(), {
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

function appPassword (): string {
  return process.env.APP_PASSWORD ?? ''
}

function secretEqual (a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest()
  const right = createHash('sha256').update(b).digest()
  return timingSafeEqual(left, right)
}

function isSecureRequest (req: Request): boolean {
  return req.secure || req.get('x-forwarded-proto') === 'https'
}

function cookieValue (req: Request): string | undefined {
  const header = req.headers.cookie
  if (header == null || header === '') return undefined

  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    if (trimmed.slice(0, eq) !== SESSION_COOKIE) continue
    try {
      return decodeURIComponent(trimmed.slice(eq + 1))
    } catch {
      return trimmed.slice(eq + 1)
    }
  }

  return undefined
}
