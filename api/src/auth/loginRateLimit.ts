import type { Request } from 'express'

export const LOGIN_RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000
}

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const expireBuckets = () => {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= Date.now()) {
      buckets.delete(key)
    }
  }
}

export function resetLoginRateLimit (): void {
  buckets.clear()
}

export function isLoginRateLimited (req: Request): boolean {
  const bucket = buckets.get(clientKey(req))
  if (bucket == null) return false
  if (bucket.resetAt <= Date.now()) {
    buckets.delete(clientKey(req))
    return false
  }
  return bucket.count >= LOGIN_RATE_LIMIT.maxAttempts
}

export function recordFailedLogin (req: Request): void {
  expireBuckets()
  const key = clientKey(req)
  const now = Date.now()
  const existing = buckets.get(key)
  if (existing == null || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + LOGIN_RATE_LIMIT.windowMs })
    return
  }
  existing.count += 1
}

function clientKey (req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown'
}
