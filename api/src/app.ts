import path from 'node:path'
import { fileURLToPath } from 'node:url'

import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { bugsnagErrorHandler, bugsnagRequestHandler } from './middleware/bugsnag.js'
import { healthRouter } from './routes/health.js'
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

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'img-src': ["'self'", 'data:', 'https:'],
          'manifest-src': ["'self'"],
          'worker-src': ["'self'"]
        }
      }
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
  app.use('/books', booksViewRouter)

  app.get('/', (_req, res) => res.redirect('/books'))

  app.use(notFoundHandler)
  // BugSnag's error handler must come before other error handlers; it calls next(err).
  app.use(bugsnagErrorHandler)
  app.use(errorHandler)

  return app
}
