import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'

const app = createApp()

describe('GET /health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'ok',
      service: 'book-camera-api'
    })
    expect(typeof res.body.timestamp).toBe('string')
  })
})
