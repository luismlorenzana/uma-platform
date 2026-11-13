// The look measures (P157, LR12): what a frame's pixels say about its look, so a capture can be held against the
// references' ranges before anyone looks at it. They flag flat, evenly lit, uniformly sharp frames; they don't judge
// taste. Pure, on straight 8-bit RGBA, after the frame is scaled to a standard width so every image is read alike.

export interface Rgba { data: Uint8Array; width: number; height: number }

export interface LookMeasures {
  /** Perceptual lightness (CIELAB L*, 0–100): mean, spread and the 5th to 95th percentile range. */
  lightness: { mean: number; std: number; p5: number; p95: number; range: number }
  /** Share of the frame in deep shadow (L* < 25) and in highlight (L* > 85). */
  shadowShare: number
  highlightShare: number
  /** Colourfulness (CIELAB chroma): mean and 90th percentile. */
  chroma: { mean: number; p90: number }
  /** Temperature contrast: yellow–blue (b*) of the brightest quarter minus the darkest quarter; positive is warm light over cool shadow. */
  warmCool: number
  /** Edge darkening: the outer tenth's mean lightness over the middle half's (1 is none, lower is a stronger vignette). */
  vignette: number
  /** Share of the frame that's soft (block sharpness under 15% of the frame's sharpest blocks): depth of field at work. */
  blurShare: number
  /** The middle third's sharpness over the top and bottom thirds' (above 1 is a focus band in the middle, as tilt-shift). */
  focusBand: number
  /** Colours (4 bits a channel) that cover 90% of the frame: how much variety the palette carries. */
  palette: number
}

const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const LIN = Float64Array.from({ length: 256 }, (_, i) => lin(i))
const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)

/** CIELAB (D65) of every pixel: L*, a*, b*, as three arrays. */
export function lab(image: Rgba): { L: Float64Array; a: Float64Array; b: Float64Array } {
  const n = image.width * image.height, L = new Float64Array(n), A = new Float64Array(n), B = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const r = LIN[image.data[i * 4]!]!, g = LIN[image.data[i * 4 + 1]!]!, bl = LIN[image.data[i * 4 + 2]!]!
    const x = (0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * bl, z = (0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883
    const fx = f(x), fy = f(y), fz = f(z)
    L[i] = 116 * fy - 16; A[i] = 500 * (fx - fy); B[i] = 200 * (fy - fz)
  }
  return { L, a: A, b: B }
}

const quantile = (sorted: ArrayLike<number>, q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]!
const mean = (xs: ArrayLike<number>) => { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[i]!; return xs.length ? s / xs.length : 0 }

/** Per-block sharpness: the variance of the Laplacian of L* in `block`-pixel squares, row by row. */
export function blockSharpness(L: Float64Array, width: number, height: number, block = 16): { cols: number; rows: number; values: Float64Array } {
  const cols = Math.floor(width / block), rows = Math.floor(height / block), values = new Float64Array(cols * rows)
  for (let by = 0; by < rows; by++) for (let bx = 0; bx < cols; bx++) {
    let s = 0, s2 = 0, n = 0
    for (let y = Math.max(1, by * block); y < Math.min(height - 1, (by + 1) * block); y++) {
      for (let x = Math.max(1, bx * block); x < Math.min(width - 1, (bx + 1) * block); x++) {
        const i = y * width + x, lap = 4 * L[i]! - L[i - 1]! - L[i + 1]! - L[i - width]! - L[i + width]!
        s += lap; s2 += lap * lap; n++
      }
    }
    values[by * cols + bx] = n ? s2 / n - (s / n) ** 2 : 0
  }
  return { cols, rows, values }
}

export function measure(image: Rgba): LookMeasures {
  const { width, height } = image, n = width * height
  const { L, a, b } = lab(image)
  const sortedL = Float64Array.from(L).sort()
  const p5 = quantile(sortedL, 0.05), p95 = quantile(sortedL, 0.95), m = mean(L)
  let v = 0, shadow = 0, high = 0
  const chroma = new Float64Array(n)
  for (let i = 0; i < n; i++) { v += (L[i]! - m) ** 2; if (L[i]! < 25) shadow++; if (L[i]! > 85) high++; chroma[i] = Math.hypot(a[i]!, b[i]!) }
  const sortedC = Float64Array.from(chroma).sort()
  // Temperature: b* of the brightest quarter against the darkest quarter.
  const q25 = quantile(sortedL, 0.25), q75 = quantile(sortedL, 0.75)
  let warmS = 0, warmN = 0, coolS = 0, coolN = 0
  for (let i = 0; i < n; i++) { if (L[i]! >= q75) { warmS += b[i]!; warmN++ } else if (L[i]! <= q25) { coolS += b[i]!; coolN++ } }
  // Vignette: the outer tenth of the frame against its middle half.
  let edgeS = 0, edgeN = 0, midS = 0, midN = 0
  const ex = width * 0.1, ey = height * 0.1
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x
    if (x < ex || x >= width - ex || y < ey || y >= height - ey) { edgeS += L[i]!; edgeN++ }
    else if (x >= width * 0.25 && x < width * 0.75 && y >= height * 0.25 && y < height * 0.75) { midS += L[i]!; midN++ }
  }
  // Depth of field: soft blocks, and the middle band's sharpness against the top and bottom.
  const sharp = blockSharpness(L, width, height)
  const sortedS = Float64Array.from(sharp.values).sort(), top = quantile(sortedS, 0.95) || 1
  let soft = 0
  for (const s of sharp.values) if (s < 0.15 * top) soft++
  const band = (r0: number, r1: number) => {
    const xs: number[] = []
    for (let r = Math.floor(r0 * sharp.rows); r < Math.floor(r1 * sharp.rows); r++) for (let c = 0; c < sharp.cols; c++) xs.push(sharp.values[r * sharp.cols + c]!)
    xs.sort((p, q) => p - q)
    return xs.length ? quantile(xs, 0.5) : 0
  }
  const middle = band(1 / 3, 2 / 3), outer = (band(0, 1 / 3) + band(2 / 3, 1)) / 2
  // Palette: 4-bit colours covering 90% of the frame.
  const counts = new Map<number, number>()
  for (let i = 0; i < n; i++) { const k = ((image.data[i * 4]! >> 4) << 8) | ((image.data[i * 4 + 1]! >> 4) << 4) | (image.data[i * 4 + 2]! >> 4); counts.set(k, (counts.get(k) ?? 0) + 1) }
  let covered = 0, palette = 0
  for (const c of [...counts.values()].sort((p, q) => q - p)) { if (covered >= 0.9 * n) break; covered += c; palette++ }
  const r2 = (x: number) => Math.round(x * 100) / 100
  return {
    lightness: { mean: r2(m), std: r2(Math.sqrt(v / n)), p5: r2(p5), p95: r2(p95), range: r2(p95 - p5) },
    shadowShare: r2(shadow / n), highlightShare: r2(high / n),
    chroma: { mean: r2(mean(chroma)), p90: r2(quantile(sortedC, 0.9)) },
    warmCool: r2((warmN ? warmS / warmN : 0) - (coolN ? coolS / coolN : 0)),
    vignette: r2(midN && midS ? edgeS / edgeN / (midS / midN) : 1),
    blurShare: r2(sharp.values.length ? soft / sharp.values.length : 0),
    focusBand: r2(outer > 0 ? middle / outer : middle > 0 ? 9.99 : 1),
    palette,
  }
}

/** Where a measure sits against the references: below their range, inside it, or above it (with the range). */
export function against(value: number, refs: readonly number[]): { range: [number, number]; verdict: 'below' | 'within' | 'above' } {
  const lo = Math.min(...refs), hi = Math.max(...refs)
  return { range: [lo, hi], verdict: value < lo ? 'below' : value > hi ? 'above' : 'within' }
}
