import 'dotenv/config'

import { createApp } from './app.js'

const parsedPort = Number(process.env.PORT)
const port = Number.isNaN(parsedPort) ? 4000 : parsedPort

const app = createApp()

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
