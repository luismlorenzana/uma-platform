// Decode the source PNG bytes directly: Canvas image decoding can round RGB under partial alpha.
// These functions are also embedded in the local album, so previews use the same straight-alpha byte contract.
export async function decodePortraitPNG(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (bytes.length < 33 || signature.some((n, i) => bytes[i] !== n)) throw Error('Invalid portrait PNG')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), chunks = []
  let width = 0, height = 0, channels = 0, ended = false
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = view.getUint32(offset), end = offset + length + 12
    if (end > bytes.length) throw Error('Truncated portrait PNG')
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    if (type === 'IHDR') {
      if (offset !== 8 || length !== 13) throw Error('Invalid portrait header')
      width = view.getUint32(offset + 8); height = view.getUint32(offset + 12)
      channels = bytes[offset + 17] === 6 ? 4 : bytes[offset + 17] === 2 ? 3 : 0
      if (!width || !height || width > 4096 || height > 4096 || bytes[offset + 16] !== 8 || !channels || bytes[offset + 18] || bytes[offset + 19] || bytes[offset + 20]) throw Error('RGB/RGBA8 non-interlaced PNG required')
    }
    if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length))
    if (type === 'IEND') { ended = true; break }
    offset = end
  }
  if (!channels || !chunks.length || !ended) throw Error('Incomplete portrait PNG')
  const scan = new Uint8Array(await new Response(new Blob(chunks).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer())
  const stride = width * channels
  if (scan.length !== height * (stride + 1)) throw Error('Invalid portrait scanlines')
  const decoded = new Uint8Array(width * height * channels)
  const paeth = (a, b, c) => { const p = a + b - c, x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c); return x <= y && x <= z ? a : y <= z ? b : c }
  let pos = 0
  for (let y = 0; y < height; y++) {
    const filter = scan[pos++]
    if (filter > 4) throw Error('Invalid portrait PNG filter')
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x, left = x >= channels ? decoded[i - channels] : 0, up = y ? decoded[i - stride] : 0, corner = y && x >= channels ? decoded[i - stride - channels] : 0
      const prediction = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, corner)
      decoded[i] = (scan[pos++] + prediction) & 255
    }
  }
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    for (let c = 0; c < 3; c++) data[i * 4 + c] = decoded[i * channels + c]
    data[i * 4 + 3] = channels === 4 ? decoded[i * channels + 3] : 255
  }
  return { width, height, data }
}

export function composePortraitRGBA(base, face, position) {
  const out = new Uint8ClampedArray(base.data)
  if (!face) return out
  if (!Number.isInteger(position?.x) || !Number.isInteger(position?.y) || position.x < 0 || position.y < 0 || position.x + face.width > base.width || position.y + face.height > base.height) throw Error('Face placement outside portrait')
  for (let y = 0; y < face.height; y++) for (let x = 0; x < face.width; x++) {
    const i = (y * face.width + x) * 4, j = ((position.y + y) * base.width + position.x + x) * 4, alpha = face.data[i + 3] / 255
    for (let c = 0; c < 3; c++) out[j + c] = Math.round(base.data[j + c] * (1 - alpha) + face.data[i + c] * alpha)
  }
  return out
}
