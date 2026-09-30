import 'dotenv/config'

import { createApp } from './app.js'

const parsedPort = Number(process.env.PORT)
const port = Number.isNaN(parsedPort) ? 4000 : parsedPort

const app = createApp()

if (process.env.APP_PASSWORD == null || process.env.APP_PASSWORD === '') {
  console.warn('APP_PASSWORD is not set; logins will be rejected')
}

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
