import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from '../src/app.js'

const app = createApp()

describe('PWA assets', () => {
  it('serves the web app manifest', async () => {
    const res = await request(app).get('/manifest.json')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/manifest|json/)
    expect(res.body).toMatchObject({
      name: 'Book Camera',
      short_name: 'Book Camera',
      start_url: '/books',
      scope: '/',
      display: 'standalone',
      theme_color: '#8a5a44',
      background_color: '#f7f5f0'
    })
    expect(res.body.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/icons/icon-192.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/icons/icon-512.png', sizes: '512x512' })
    ]))
  })

  it('serves the service worker script', async () => {
    const res = await request(app).get('/sw.js')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/javascript/)
    expect(res.text).toContain('book-camera-v1')
    expect(res.text).toContain('addEventListener')
  })

  it('links install metadata from HTML pages', async () => {
    const res = await request(app).get('/books')

    expect(res.status).toBe(200)
    expect(res.text).toContain('viewport-fit=cover')
    expect(res.text).toContain('rel="manifest"')
    expect(res.text).toContain('href="/manifest.json"')
    expect(res.text).toContain('rel="apple-touch-icon"')
    expect(res.text).toContain('href="/books/scan"')
    expect(res.text).toContain('src="/register-sw.js"')
  })

  it('loads the scan helper from a static script', async () => {
    const res = await request(app).get('/books/scan')

    expect(res.status).toBe(200)
    expect(res.text).toContain('src="/scan.js"')
    expect(res.text).toContain('capture="environment"')
  })
})
