// Writes the PWA PNG icons from a simple in-memory book mark.
// Run from api/: node scripts/generate-icons.mjs
import { createWriteStream, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const iconsDir = path.join(__dirname, '..', 'src', 'public', 'icons')

const PRIMARY = [0x8a, 0x5a, 0x44, 0xff]
const PRIMARY_DARK = [0x6f, 0x46, 0x35, 0xff]
const CREAM = [0xf7, 0xf5, 0xf0, 0xff]
const PAGE = [0xff, 0xfd, 0xfa, 0xff]
const RULE = [0x8a, 0x5a, 0x44, 0x59]

function crc32 (buf) {
  let crc = 0xffffffff
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk (type, data) {
  const typeBuf = Buffer.from(type)
  const header = Buffer.alloc(4)
  header.writeUInt32BE(data.length)
  const payload = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(payload))
  return Buffer.concat([header, payload, crc])
}

function writePng (filePath, width, pixels) {
  const height = width
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1)
    raw[rowStart] = 0
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])

  createWriteStream(filePath).end(png)
}

function setPixel (pixels, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return
  const i = (y * size + x) * 4
  pixels[i] = color[0]
  pixels[i + 1] = color[1]
  pixels[i + 2] = color[2]
  pixels[i + 3] = color[3]
}

function fillRect (pixels, size, x0, y0, x1, y1, color) {
  const left = Math.max(0, Math.floor(x0))
  const top = Math.max(0, Math.floor(y0))
  const right = Math.min(size - 1, Math.ceil(x1))
  const bottom = Math.min(size - 1, Math.ceil(y1))
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      setPixel(pixels, size, x, y, color)
    }
  }
}

function fillRoundedRect (pixels, size, x0, y0, x1, y1, radius, color) {
  const left = Math.floor(x0)
  const top = Math.floor(y0)
  const right = Math.ceil(x1)
  const bottom = Math.ceil(y1)
  const r = Math.max(0, Math.floor(radius))
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = x < left + r ? left + r - x : x > right - r ? x - (right - r) : 0
      const dy = y < top + r ? top + r - y : y > bottom - r ? y - (bottom - r) : 0
      if (dx * dx + dy * dy <= r * r) {
        setPixel(pixels, size, x, y, color)
      }
    }
  }
}

function drawIcon (size) {
  const pixels = Buffer.alloc(size * size * 4)
  fillRoundedRect(pixels, size, 0, 0, size - 1, size - 1, size * 0.18, PRIMARY)

  const bookLeft = size * 0.24
  const bookTop = size * 0.18
  const bookRight = size * 0.76
  const bookBottom = size * 0.82
  fillRoundedRect(pixels, size, bookLeft, bookTop, bookRight, bookBottom, size * 0.04, PAGE)
  fillRect(pixels, size, bookLeft, bookTop, bookLeft + size * 0.06, bookBottom, PRIMARY_DARK)
  fillRect(pixels, size, bookLeft + size * 0.06, bookTop, bookLeft + size * 0.07, bookBottom, CREAM)

  const ruleLeft = bookLeft + size * 0.14
  const ruleRight = bookRight - size * 0.1
  fillRoundedRect(pixels, size, ruleLeft, size * 0.32, ruleRight, size * 0.36, size * 0.01, RULE)
  fillRoundedRect(pixels, size, ruleLeft, size * 0.42, ruleRight - size * 0.08, size * 0.46, size * 0.01, RULE)
  fillRoundedRect(pixels, size, ruleLeft, size * 0.52, ruleRight - size * 0.16, size * 0.56, size * 0.01, RULE)

  return pixels
}

mkdirSync(iconsDir, { recursive: true })

for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180]
]) {
  writePng(path.join(iconsDir, name), size, drawIcon(size))
}

console.log(`Wrote icons to ${iconsDir}`)
