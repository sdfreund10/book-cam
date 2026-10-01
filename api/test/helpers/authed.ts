import type { Express } from 'express'
import request, { type Test } from 'supertest'

import { SESSION_COOKIE, sessionToken } from '../../src/auth/session.js'

interface AuthedRequest {
  get: (url: string) => Test
  post: (url: string) => Test
  put: (url: string) => Test
  patch: (url: string) => Test
  delete: (url: string) => Test
}

export function authed (app: Express): AuthedRequest {
  const cookie = `${SESSION_COOKIE}=${sessionToken()}`

  return {
    get (url: string) {
      return request(app).get(url).set('Cookie', cookie)
    },
    post (url: string) {
      return request(app).post(url).set('Cookie', cookie)
    },
    put (url: string) {
      return request(app).put(url).set('Cookie', cookie)
    },
    patch (url: string) {
      return request(app).patch(url).set('Cookie', cookie)
    },
    delete (url: string) {
      return request(app).delete(url).set('Cookie', cookie)
    }
  }
}
