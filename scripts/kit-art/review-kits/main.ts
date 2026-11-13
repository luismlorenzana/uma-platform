// Draws each code-drawn town and biome kit through uma-stage's StageEngine, uma-quest's builder, in its test town or
// test room (the stand-in party for scale), and saves the captures beside the kit's sheets. Stand-ins only; no Uma art.
import { parseKitAtlas } from '../../../packages/stage/src/formats/index.ts'
import { StageEngine } from '../../../packages/stage/src/stage/engine.ts'
import { pixelTexture } from '../../../packages/stage/src/world/kits.ts'
import { TextureLoader } from 'three'

const jsons = import.meta.glob('../../../packages/art/kit-*/atlas.json', { eager: true, import: 'default' }) as Record<string, unknown>
const pngs = import.meta.glob('../../../packages/art/kit-*/atlas.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const KITS = ['kit-town-spellblade', 'kit-town-mage', 'kit-town-summoner', 'kit-town-healer', 'kit-meadow', 'kit-ruins', 'kit-marsh', 'kit-coast']
const log = (t: string) => { document.getElementById('log')!.textContent = t }

async function main(): Promise<void> {
  const canvas = document.getElementById('stage') as HTMLCanvasElement
  for (const id of KITS) {
    const kit = parseKitAtlas(jsons[`../../../packages/art/${id}/atlas.json`])
    const town = kit.kind === 'town', engine = new StageEngine(canvas, { saver: false })
    engine.resize(1280, 720, 1)
    // Each kit's own page (loadKitPage keeps one a kind, for a game).
    const loaded = { kit, page: pixelTexture(await new TextureLoader().loadAsync(pngs[`../../../packages/art/${id}/atlas.png`]!)) }
    engine.setKit(kit.kind as 'town' | 'biome', loaded)
    engine.load(town ? 'town' : 'room')
    for (let i = 0; i < 8; i++) { engine.step(1 / 30); await new Promise((r) => setTimeout(r, 20)) }
    engine.step(1 / 30)
    const r = await fetch(`/__save?kit=${id}&name=${town ? 'town' : 'room'}-1x.png`, { method: 'POST', body: canvas.toDataURL('image/png') })
    if (!r.ok) throw new Error(await r.text())
    engine.dispose()
    log(`saved ${id}`)
  }
  log('saved all')
}
main().catch((e) => log(`failed: ${e instanceof Error ? e.message : String(e)}`))
