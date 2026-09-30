import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { SESSION_COOKIE, sessionToken } from '../src/auth/session.js'
import { createApp } from '../src/app.js'

const app = createApp()
const password = process.env.APP_PASSWORD as string

describe('authentication', () => {
  it('leaves /health public', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('serves the stylesheet without signing in', async () => {
    const res = await request(app).get('/styles.css')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/css/)
    expect(res.headers['content-security-policy'] ?? '').not.toMatch(/upgrade-insecure-requests/)
  })

  it('rejects an incorrect password', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ password: 'not-the-password' })

    expect(res.status).toBe(401)
    expect(res.text).toContain('That password is incorrect.')
  })

  it('accepts the session cookie on HTML routes', async () => {
    const res = await request(app)
      .get('/books')
      .set('Cookie', `${SESSION_COOKIE}=${sessionToken()}`)

    expect(res.status).toBe(200)
    expect(res.text).toContain('Your Books')
  })

  it('sets a long-lived session cookie on the HTML login form', async () => {
    const agent = request.agent(app)

    const login = await agent
      .post('/login')
      .type('form')
      .send({ password, next: '/books' })

    expect(login.status).toBe(302)
    expect(login.headers.location).toBe('/books')
    expect(login.headers['set-cookie']?.join(';')).toContain(`${SESSION_COOKIE}=`)

    const res = await agent.get('/books')
    expect(res.status).toBe(200)
    expect(res.text).toContain('Your Books')
  })

  it('redirects unauthenticated HTML requests to /login', async () => {
    const res = await request(app).get('/books')

    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/login?next=%2Fbooks')
  })
})
