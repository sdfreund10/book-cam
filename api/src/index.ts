import 'dotenv/config'

import { createApp } from './app.js'

const parsedPort = Number(process.env.PORT)
const port = Number.isNaN(parsedPort) ? 4000 : parsedPort

const app = createApp()

if (process.env.APP_PASSWORD == null || process.env.APP_PASSWORD === '') {
  console.error('APP_PASSWORD is required')
  process.exit(1)
}

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
