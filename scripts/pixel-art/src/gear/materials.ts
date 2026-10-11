// The refined materials' colors, as the item painters in items/refined/ draw them (same base colors and ramp options),
// so a grade-g piece of gear wears the color of the material it is made from.
import { ramp, type RampOptions } from '../color.ts'
import type { Sprite } from '../sprite.ts'

export interface Material {
  base: string
  opts: RampOptions
  /** Glow of magic materials (legendary grades). */
  glow?: string
  /** The material's own second color: grain, weave accent, suede, cord… */
  accent?: string
}

/** Adds a material's ramp to the sprite and returns its id. */
export function use(s: Sprite, m: Material | string, opts?: RampOptions): number {
  if (typeof m === 'string') return s.addRamp(ramp(m, opts))
  return s.addRamp(ramp(m.base, opts ?? m.opts))
}

// items/refined/ores.ts
export const METALS: readonly Material[] = [
  { base: '#e07a3a', opts: { lift: 0.4, drop: 0.3 } }, // copper
  { base: '#b3bcc2', opts: { lift: 0.28, drop: 0.24 } }, // tin
  { base: '#8a93a0', opts: { lift: 0.4, drop: 0.3 } }, // iron
  { base: '#e4e8f1', opts: { lift: 0.55, drop: 0.34 } }, // silver
  { base: '#3a6ae0', opts: { lift: 0.4, drop: 0.3 } }, // cobalt
  { base: '#f4c534', opts: { lift: 0.45, drop: 0.3 } }, // gold
  { base: '#d6ecf2', opts: { lift: 0.55, drop: 0.36 } }, // platinum
  { base: '#9a96dc', opts: { lift: 0.42, drop: 0.3 } }, // titanium
  { base: '#5ff2c8', opts: { lift: 0.42, drop: 0.32 }, glow: '#9dffe6' }, // mythril
  { base: '#ff8d2c', opts: { lift: 0.45, drop: 0.3 }, glow: '#ffc35a' }, // orichalcum
]

// items/refined/woods.ts
const WOOD: RampOptions = { hueShift: 8, satShift: 0.04, lift: 0.3, drop: 0.26 }
export const WOODS: readonly Material[] = [
  { base: '#e0ab5a', opts: WOOD }, // pine
  { base: '#efe0bd', opts: { hueShift: 6, satShift: 0.03, lift: 0.3, drop: 0.2 }, accent: '#6d5a45' }, // birch
  { base: '#c46c47', opts: WOOD }, // cedar
  { base: '#ecd2a6', opts: WOOD }, // maple
  { base: '#ad7a45', opts: WOOD }, // oak
  { base: '#b4553c', opts: WOOD }, // cherry
  { base: '#7c3427', opts: { hueShift: 8, satShift: 0.04, lift: 0.34, drop: 0.28 } }, // mahogany
  { base: '#352c2e', opts: { hueShift: 10, satShift: 0.03, lift: 0.3, drop: 0.3 } }, // ebony
  { base: '#5b5168', opts: { hueShift: 8, satShift: 0.03, lift: 0.3, drop: 0.28 }, accent: '#8ff0d8', glow: '#9ff7e3' }, // elderwood
  { base: '#c9c45a', opts: { hueShift: 10, satShift: 0.04, lift: 0.4, drop: 0.28 }, accent: '#f6ffb0', glow: '#e6ff9a' }, // yggdrasil
]

// items/refined/fibers.ts
const CLOTH: RampOptions = { hueShift: 8, satShift: 0.04, lift: 0.3, drop: 0.24 }
export const CLOTHS: readonly Material[] = [
  { base: '#d5c9a8', opts: CLOTH, accent: '#8a7a5a' }, // linen
  { base: '#b58a55', opts: CLOTH, accent: '#e2cf9a' }, // burlap
  { base: '#a6a272', opts: CLOTH }, // hemp
  { base: '#eeeff2', opts: { hueShift: 10, satShift: 0.03, lift: 0.4, drop: 0.16 }, accent: '#5f8fe0' }, // cotton
  { base: '#e3d8bd', opts: CLOTH }, // wool
  { base: '#b98256', opts: CLOTH }, // alpaca
  { base: '#c9a3a6', opts: CLOTH, accent: '#e8d2c4' }, // cashmere
  { base: '#d24f72', opts: { hueShift: 10, satShift: 0.03, lift: 0.4, drop: 0.28 } }, // silk
  { base: '#ad98ec', opts: { hueShift: 10, satShift: 0.03, lift: 0.42, drop: 0.26 }, accent: '#fff6c8', glow: '#d9ccff' }, // moonsilk
  { base: '#7fc4f5', opts: { hueShift: 8, satShift: 0.03, lift: 0.4, drop: 0.24 }, accent: '#ffffff', glow: '#cdeeff' }, // cloudweave
]

// items/refined/hides-scales.ts (accent = the suede side)
const HIDE: RampOptions = { lift: 0.3, drop: 0.28, hueShift: 8, satShift: 0.04 }
export interface Hide extends Material {
  tie: string
  surface: 'suede' | 'pores' | 'mottle' | 'scales' | 'studs' | 'bigscales' | 'stripes' | 'plates' | 'iridescent' | 'dragon'
  /** Studs, stripes or scale rims. */
  mark?: string
}
export const HIDES: readonly Hide[] = [
  { base: '#f0b6c4', opts: { lift: 0.32, drop: 0.22, hueShift: 8, satShift: 0.03 }, accent: '#fbe3d8', tie: '#8fc8ee', surface: 'suede' }, // puffbun
  { base: '#94643f', opts: HIDE, accent: '#d9b48a', tie: '#d8c38e', surface: 'pores' }, // boarling
  { base: '#8f8a86', opts: HIDE, accent: '#ddd5c8', tie: '#5a4636', surface: 'mottle' }, // wolfkin
  { base: '#d4ab72', opts: HIDE, accent: '#f1dfbf', tie: '#7a5636', surface: 'scales' }, // lizard
  { base: '#56708f', opts: { lift: 0.42, drop: 0.3, hueShift: 8, satShift: 0.03 }, accent: '#c9c3b8', tie: '#4a3a30', surface: 'studs', mark: '#e8eef6' }, // ironback
  { base: '#4f9a58', opts: HIDE, accent: '#d6dfb0', tie: '#3d2e22', surface: 'bigscales' }, // basilisk
  { base: '#d38b3c', opts: HIDE, accent: '#f3dcb4', tie: '#e9dcc0', surface: 'stripes', mark: '#5a2f1c' }, // manticore
  { base: '#6b5c78', opts: HIDE, accent: '#cbbfc8', tie: '#c9a46a', surface: 'plates' }, // behemoth
  { base: '#3fb3a6', opts: { lift: 0.38, drop: 0.28, hueShift: 10, satShift: 0.04 }, accent: '#e2f0ea', tie: '#2e2a3e', surface: 'iridescent', mark: '#8a6ad8', glow: '#a8f0ff' }, // wyvern
  { base: '#b3202e', opts: { lift: 0.36, drop: 0.3, hueShift: 10, satShift: 0.04 }, accent: '#f2d39a', tie: '#e0a92e', surface: 'dragon', mark: '#ffd25a', glow: '#ffc04a' }, // dragonhide
]

// items/refined/crystals.ts
const GEM: RampOptions = { lift: 0.42, drop: 0.3, hueShift: 10, satShift: 0.04 }
export const GEMS: readonly Material[] = [
  { base: '#d9d4ea', opts: { lift: 0.5, drop: 0.3, hueShift: 12, satShift: 0.03 } }, // quartz
  { base: '#9a55d2', opts: GEM }, // amethyst
  { base: '#f1ad2c', opts: GEM }, // citrine
  { base: '#a51e3a', opts: { lift: 0.4, drop: 0.32, hueShift: 8, satShift: 0.04 } }, // garnet
  { base: '#25a95a', opts: GEM }, // emerald
  { base: '#2c5bd6', opts: GEM }, // sapphire
  { base: '#e3243f', opts: GEM }, // ruby
  { base: '#cfeefb', opts: { lift: 0.6, drop: 0.32, hueShift: 14, satShift: 0.02 } }, // diamond
  { base: '#1f3fae', opts: { lift: 0.45, drop: 0.34, hueShift: 14, satShift: 0.05 }, accent: '#cfe0ff', glow: '#7fa6ff' }, // starstone
  { base: '#d8202e', opts: { lift: 0.45, drop: 0.3, hueShift: 14, satShift: 0.04 }, accent: '#ffb070', glow: '#ff6a4a' }, // philosopher's stone
]

// items/refined/bones-horns.ts
const BONE: RampOptions = { lift: 0.36, drop: 0.24, hueShift: 10, satShift: 0.04 }
export const BONES: readonly Material[] = [
  { base: '#efdcd0', opts: { lift: 0.4, drop: 0.22, hueShift: 6, satShift: 0 } }, // shell
  { base: '#dcb98a', opts: BONE }, // ammonite
  { base: '#c4b8a2', opts: BONE }, // trilobite
  { base: '#ebe0c6', opts: BONE }, // bone
  { base: '#f0e2bf', opts: BONE, accent: '#a8621f' }, // tusk (bronze cuff)
  { base: '#f2ecdc', opts: BONE, accent: '#c9a24a' }, // fang (gold cap)
  { base: '#e2d3b1', opts: BONE }, // claw
  { base: '#efe6cc', opts: BONE, accent: '#a07b52' }, // tooth (root)
  { base: '#e0d2b4', opts: BONE, accent: '#ffcf5a', glow: '#ffd88a' }, // titan
  { base: '#f4eef4', opts: { lift: 0.5, drop: 0.24, hueShift: 14, satShift: 0.04 }, accent: '#e8c46a', glow: '#f3e2ff' }, // unicorn (gilt)
]

// Fittings shared by many pieces.
export const GOLD = METALS[5] as Material
export const SILVER = METALS[3] as Material
export const IRON = METALS[2] as Material
export const BRONZE: Material = { base: '#b9773a', opts: { lift: 0.4, drop: 0.3 } }
export const LEATHER_GRIP: Material = { base: '#7a5034', opts: { lift: 0.3, drop: 0.3, hueShift: 8 } }
export const DARK_GRIP: Material = { base: '#4a3a44', opts: { lift: 0.32, drop: 0.3, hueShift: 8 } }
export const CORD: Material = { base: '#8a6440', opts: { lift: 0.32, drop: 0.28 } }
