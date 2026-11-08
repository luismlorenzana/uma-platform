import type { Pixels } from './types.js'

export function bounds(p: Pixels, threshold = 128) {
  let left = p.width, right = -1, top = p.height, bottom = -1
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) if (p.data[(y * p.width + x) * 4 + 3]! >= threshold) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y)
  }
  return { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 }
}
export function smallClusters(p: Pixels, threshold = 128): number[][] {
  const seen = new Uint8Array(p.width * p.height), out: number[][] = []
  for (let k = 0; k < seen.length; k++) {
    if (seen[k] || p.data[k * 4 + 3]! < threshold) continue
    const q = [k], group: number[] = []; seen[k] = 1
    while (q.length) {
      const n = q.pop()!; group.push(n)
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = n % p.width + dx, y = Math.floor(n / p.width) + dy, i = y * p.width + x
        if (x >= 0 && x < p.width && y >= 0 && y < p.height && !seen[i] && p.data[i * 4 + 3]! >= threshold) { seen[i] = 1; q.push(i) }
      }
    }
    if (group.length < 4) out.push(group)
  }
  return out
}
export function haze(p: Pixels): number[] {
  const out: number[] = []
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    const alpha = p.data[(y * p.width + x) * 4 + 3]!
    if (!alpha || alpha >= 128) continue
    let near = false
    for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (x + dx >= 0 && x + dx < p.width && y + dy >= 0 && y + dy < p.height && p.data[((y + dy) * p.width + x + dx) * 4 + 3]! >= 128) { near = true; break }
    }
    if (!near) out.push(y * p.width + x)
  }
  return out
}
export function handDistance(p: Pixels, a: { x: number; y: number }, palette: 'skin' | 'glove'): number {
  let distance = Infinity
  for (let dy = -20; dy <= 20; dy++) for (let dx = -20; dx <= 20; dx++) {
    const x = Math.round(a.x) + dx, y = Math.round(a.y) + dy
    if (x < 0 || x >= p.width || y < 0 || y >= p.height) continue
    const i = (y * p.width + x) * 4, [r, g, b, alpha] = [p.data[i]!, p.data[i + 1]!, p.data[i + 2]!, p.data[i + 3]!]
    if (alpha >= 128 && (palette === 'glove' ? r > 175 && g > 175 && b > 175 && Math.max(r, g, b) - Math.min(r, g, b) < 65 : r > 160 && g > 95 && b > 75 && r > g * 1.08)) distance = Math.min(distance, Math.hypot(dx, dy))
  }
  return distance
}
