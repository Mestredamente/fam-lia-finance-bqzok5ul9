/**
 * Gera os ícones PNG do PWA (192, 512 e 180) programaticamente, sem
 * dependências externas — apenas Node puro (zlib nativo para o deflate do PNG).
 *
 * O design replica o de public/icon.svg: fundo verde #10b981, círculo branco
 * central (raio 30 em viewBox 64) e texto "FF" em verde centralizado.
 *
 * Renderiza em supersampling 4x e faz downsample por média de bloco para
 * obter bordas suavizadas (anti-aliasing) no círculo e no texto.
 *
 * Roda automaticamente como plugin do Vite (buildStart) e também via
 * `npm run icons`.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_ICONS = join(__dirname, '..', 'public', 'icons')

// #10b981 — cor do tema
const GREEN = [16, 185, 129, 255]
const WHITE = [255, 255, 255, 255]

// Bitmap 7×11 do texto "FF" (dois F 5×7 com 1 coluna de espaço entre eles).
const FF = [
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
]

const SS = 4 // fator de supersampling

/**
 * Renderiza o ícone na resolução `size` e devolve um Uint8ClampedArray RGBA.
 */
function render(size) {
  const HR = size * SS
  const buf = new Uint8ClampedArray(HR * HR * 4)

  // Fundo verde
  for (let i = 0; i < HR * HR; i++) {
    const o = i * 4
    buf[o] = GREEN[0]
    buf[o + 1] = GREEN[1]
    buf[o + 2] = GREEN[2]
    buf[o + 3] = 255
  }

  const cx = HR / 2
  const cy = HR / 2
  const r = (HR * 30) / 64 // mesmo raio do SVG (r=30 em viewBox 64)
  const r2 = r * r

  // Círculo branco
  for (let y = 0; y < HR; y++) {
    for (let x = 0; x < HR; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r2) {
        const o = (y * HR + x) * 4
        buf[o] = 255
        buf[o + 1] = 255
        buf[o + 2] = 255
        buf[o + 3] = 255
      }
    }
  }

  // Texto "FF" em verde, centralizado (escala derivada do font-size 26 do SVG)
  const rows = FF.length
  const cols = FF[0].length
  const scale = Math.max(1, Math.round((HR * 26) / 64 / rows))
  const tw = cols * scale
  const th = rows * scale
  const sx = Math.round((HR - tw) / 2)
  const sy = Math.round((HR - th) / 2)

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (!FF[gy][gx]) continue
      for (let py = 0; py < scale; py++) {
        for (let px = 0; px < scale; px++) {
          const X = sx + gx * scale + px
          const Y = sy + gy * scale + py
          if (X < 0 || Y < 0 || X >= HR || Y >= HR) continue
          // mantém o texto dentro do círculo branco
          const dx = X - cx
          const dy = Y - cy
          if (dx * dx + dy * dy > r2) continue
          const o = (Y * HR + X) * 4
          buf[o] = GREEN[0]
          buf[o + 1] = GREEN[1]
          buf[o + 2] = GREEN[2]
          buf[o + 3] = 255
        }
      }
    }
  }

  return downsample(buf, HR, size)
}

/** Downsample por média de bloco SS×SS → anti-aliasing. */
function downsample(buf, HR, size) {
  const out = new Uint8ClampedArray(size * size * 4)
  const n = SS * SS
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const X = x * SS + dx
          const Y = y * SS + dy
          const o = (Y * HR + X) * 4
          r += buf[o]
          g += buf[o + 1]
          b += buf[o + 2]
          a += buf[o + 3]
        }
      }
      const oi = (y * size + x) * 4
      out[oi] = Math.round(r / n)
      out[oi + 1] = Math.round(g / n)
      out[oi + 2] = Math.round(b / n)
      out[oi + 3] = Math.round(a / n)
    }
  }
  return out
}

// --- Codificação PNG ---

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
    t[i] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(rgba, size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    for (let x = 0; x < stride; x++) raw[y * (stride + 1) + 1 + x] = rgba[y * stride + x]
  }
  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Gera (ou regenera) todos os ícones PNG em public/icons/. */
export function generateIcons() {
  mkdirSync(PUBLIC_ICONS, { recursive: true })
  const sizes = [192, 512, 180]
  for (const size of sizes) {
    const rgba = render(size)
    const png = encodePNG(rgba, size)
    writeFileSync(join(PUBLIC_ICONS, `icon-${size}.png`), png)
    console.log(`[icons] gerado icon-${size}.png (${size}×${size})`)
  }
}

const isMain = process.argv[1]?.endsWith('generate-icons.mjs')
if (isMain) generateIcons()
