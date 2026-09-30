import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { bugsnagErrorHandler, bugsnagRequestHandler } from './middleware/bugsnag.js'
import { requireAuth } from './middleware/requireAuth.js'
import { healthRouter } from './routes/health.js'
import { loginRouter } from './routes/login.js'
import { booksViewRouter } from './routes/booksView.js'
import { notFoundHandler } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
import { buildLibrarySearchUrl } from './utils/libraryLink.js'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))

export function createApp (): express.Express {
  const app = express()

  // Must be first so BugSnag can capture errors from downstream middleware.
  app.use(bugsnagRequestHandler)

  app.set('view engine', 'ejs')
  app.set('views', path.join(moduleDir, 'views'))

  // Available to every view as `buildLibrarySearchUrl(title)`.
  app.locals.buildLibrarySearchUrl = buildLibrarySearchUrl

  const cspDirectives = { ...helmet.contentSecurityPolicy.getDefaultDirectives() }
  cspDirectives['img-src'] = ["'self'", 'data:', 'https:']
  cspDirectives['manifest-src'] = ["'self'"]
  cspDirectives['worker-src'] = ["'self'"]
  // Otherwise browsers upgrade /styles.css to https on http://localhost
  // (and HTTP droplets), and the page renders unstyled.
  delete cspDirectives['upgrade-insecure-requests']

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: cspDirectives
      },
      strictTransportSecurity: process.env.NODE_ENV === 'production'
    })
  )
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
  }
  app.use(express.urlencoded({ extended: true }))
  app.use(express.static(path.join(moduleDir, 'public'), {
    setHeaders (res: express.Response, filePath: string): void {
      if (filePath.endsWith(`${path.sep}manifest.json`)) {
        res.setHeader('Content-Type', 'application/manifest+json')
      }
    }
  }))

  app.use('/health', healthRouter)
  app.use('/login', loginRouter)
  app.use('/books', requireAuth, booksViewRouter)

  app.get('/', (_req, res) => res.redirect('/books'))

  app.use(notFoundHandler)
  // BugSnag's error handler must come before other error handlers; it calls next(err).
  app.use(bugsnagErrorHandler)
  app.use(errorHandler)

  return app
}
