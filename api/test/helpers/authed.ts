import type { Express } from 'express'
import request, { type Test } from 'supertest'

import { sessionToken } from '../../src/auth/session.js'

interface AuthedRequest {
  get: (url: string) => Test
  post: (url: string) => Test
  put: (url: string) => Test
  patch: (url: string) => Test
  delete: (url: string) => Test
}

export function authed (app: Express): AuthedRequest {
  const authorization = `Bearer ${sessionToken()}`

  return {
    get (url: string) {
      return request(app).get(url).set('Authorization', authorization)
    },
    post (url: string) {
      return request(app).post(url).set('Authorization', authorization)
    },
    put (url: string) {
      return request(app).put(url).set('Authorization', authorization)
    },
    patch (url: string) {
      return request(app).patch(url).set('Authorization', authorization)
    },
    delete (url: string) {
      return request(app).delete(url).set('Authorization', authorization)
    }
  }
}
