// A sprite's tint from the scene's light (HD10; Q6): the sky and key light as a base, plus each live light within reach,
// fading with distance. Computed per sprite on the CPU and set on her material, so a lantern warms whoever walks by.

export interface TintLight { x: number; y: number; z: number; color: [number, number, number]; radius: number; strength: number }

/** RGB 0–1, each channel capped at 1.2 so a bright light can lift her a little above the base without washing out. */
export function tintAt(foot: { x: number; y: number; z: number }, base: [number, number, number], lights: readonly TintLight[]): [number, number, number] {
  const out: [number, number, number] = [...base]
  for (const l of lights) {
    const d = Math.hypot(l.x - foot.x, l.y - (foot.y + 0.8), l.z - foot.z)
    if (d >= l.radius || l.strength <= 0) continue
    const k = (1 - d / l.radius) ** 2 * l.strength * 0.6
    for (let i = 0; i < 3; i++) out[i] = out[i]! + l.color[i]! * k
  }
  return out.map((c) => Math.min(1.2, c)) as [number, number, number]
}

/** '#rrggbb' as 0–1 RGB. */
export function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
