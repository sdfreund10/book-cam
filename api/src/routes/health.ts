import { Router } from 'express'

export const healthRouter = Router()

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'book-camera-api',
    timestamp: new Date().toISOString()
  })
})
