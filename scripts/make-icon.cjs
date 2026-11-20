// Generates a 512x512 PNG app icon (rounded square, teal->cyan gradient, white download arrow).
// Zero dependencies: hand-rolled PNG encoder using node's zlib.
const { deflateSync } = require('zlib')
const { writeFileSync } = require('fs')

const S = 512
const buf = Buffer.alloc(S * S * 4)

// CRC32 table
const crcTable = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c
}
function crc32(b) {
  let c = -1
  for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// colors
const TEAL = [20, 184, 166] // #14b8a6
const BLUE = [14, 165, 233] // #0ea5e9

const R = 110 // corner radius

function roundedRectContains(x, y) {
  const r = R
  const inX = x >= r && x < S - r
  const inY = y >= r && y < S - r
  if (inX || inY) return true
  // corner circles
  const cx = x < r ? r : S - r
  const cy = y < r ? r : S - r
  const dx = x - cx + 0.5
  const dy = y - cy + 0.5
  return dx * dx + dy * dy <= r * r
}

function arrowContains(x, y) {
  // shaft
  if (x >= 226 && x < 286 && y >= 118 && y < 300) return true
  // head: triangle apex (256, 418), base y=280 spanning [136, 376]
  if (y >= 280 && y <= 418) {
    const t = (y - 280) / (418 - 280) // 0 at base -> 1 at apex
    const half = 120 * (1 - t)
    if (x >= 256 - half && x <= 256 + half) return true
  }
  // tray
  if (x >= 140 && x < 372 && y >= 436 && y < 468) return true
  return false
}

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4
    if (!roundedRectContains(x, y)) {
      buf[i + 3] = 0 // transparent
      continue
    }
    if (arrowContains(x, y)) {
      buf[i] = 255
      buf[i + 1] = 255
      buf[i + 2] = 255
      buf[i + 3] = 255
      continue
    }
    // diagonal gradient teal -> blue
    const t = (x + y) / (2 * S)
    buf[i] = Math.round(TEAL[0] + (BLUE[0] - TEAL[0]) * t)
    buf[i + 1] = Math.round(TEAL[1] + (BLUE[1] - TEAL[1]) * t)
    buf[i + 2] = Math.round(TEAL[2] + (BLUE[2] - TEAL[2]) * t)
    buf[i + 3] = 255
  }
}

// PNG encode: scanlines with filter 0
const raw = Buffer.alloc(S * (1 + S * 4))
for (let y = 0; y < S; y++) {
  raw[y * (1 + S * 4)] = 0
  buf.copy(raw, y * (1 + S * 4) + 1, y * S * 4, (y + 1) * S * 4)
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

writeFileSync(process.argv[2] || 'icon.png', png)
console.log('icon written:', process.argv[2] || 'icon.png')
