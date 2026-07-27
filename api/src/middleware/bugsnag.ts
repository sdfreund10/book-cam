import BugsnagJs from '@bugsnag/js'
import BugsnagPluginExpressMod from '@bugsnag/plugin-express'
import type { ErrorRequestHandler, RequestHandler } from 'express'

// BugSnag provides its own types; NodeNext exposes the CJS export on `.default`.
const Bugsnag = BugsnagJs.default
const BugsnagPluginExpress = BugsnagPluginExpressMod.default

const apiKey = process.env.BUGSNAG_API_KEY
if (apiKey != null && apiKey !== '' && process.env.NODE_ENV !== 'test') {
  Bugsnag.start({
    apiKey,
    plugins: [BugsnagPluginExpress]
  })
} else {
  console.warn('BUGSNAG_API_KEY is not set')
}

const middleware = Bugsnag.isStarted() ? Bugsnag.getPlugin('express') : undefined

export const bugsnagRequestHandler: RequestHandler =
  middleware?.requestHandler ?? ((_req, _res, next) => { next() })

export const bugsnagErrorHandler: ErrorRequestHandler =
  middleware?.errorHandler ?? ((err, _req, _res, next) => { next(err) })
