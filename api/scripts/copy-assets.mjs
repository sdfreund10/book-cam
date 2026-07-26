// tsc only emits compiled .ts -> .js. This copies the non-TS runtime assets
// (EJS views, static public files) into dist/ alongside the compiled output.
import { cpSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

for (const dir of ['views', 'public']) {
  cpSync(path.join(root, 'src', dir), path.join(root, 'dist', dir), { recursive: true })
}
