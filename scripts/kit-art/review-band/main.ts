// Renders kit-farm through uma-stage's BandStage (the builder the farm will use) and saves the review captures:
// the sample band at one texel a pixel (the Fields, the Mill and the overgrown Coop over the path row), and the whole
// stand-in farm at a 2× phone's width (fit-to-width), by day and by night. Stand-in figures only; no Uma art.
import atlasUrl from '../../../packages/art/kit-farm/atlas.png?url'
import atlasJson from '../../../packages/art/kit-farm/atlas.json'
import { parseKitAtlas } from '../../../packages/stage/src/formats/index.ts'
import { BandStage } from '../../../packages/stage/src/stage/bandStage.ts'
import type { StageGrade } from '../../../packages/stage/src/stage/grade.ts'
import { standInSet } from '../../../packages/stage/src/sprites/standInSet.ts'
import { SAMPLE_FARM } from '../../../packages/stage/src/world/farmSample.ts'
import { checkedKit, loadKitPage } from '../../../packages/stage/src/world/kits.ts'

const SPRING: StageGrade = { sky: '#e8f4ff', ground: '#4a5a30', skyLight: 1.5, sun: '#fff6e0', sunLight: 1.35, tint: '#ffffff', background: '#9fd3ee', lamps: 0 }
const NIGHT: StageGrade = { sky: '#5f6fb0', ground: '#181a2a', skyLight: 0.55, sun: '#8a9ad4', sunLight: 0.3, tint: '#9fadd8', background: '#121830', lamps: 1 }
const log = (t: string) => { document.getElementById('log')!.textContent = t }

async function save(name: string, canvas: HTMLCanvasElement): Promise<void> {
  const r = await fetch(`/__save?name=${name}`, { method: 'POST', body: canvas.toDataURL('image/png') })
  if (!r.ok) throw new Error(await r.text())
}

async function main(): Promise<void> {
  const kit = checkedKit(parseKitAtlas(atlasJson), 'kit-farm')
  const loaded = await loadKitPage('farm', kit, atlasUrl)
  if (!loaded) throw new Error('the kit page did not load')
  const canvas = document.getElementById('stage') as HTMLCanvasElement
  const shoot = async (name: string, css: [number, number], ratio: number, fit: 'none' | 'width', grade: StageGrade, z: number) => {
    const stage = new BandStage(canvas, { saver: false, fit })
    stage.resize(css[0], css[1], ratio)
    stage.setGrade(grade)
    stage.setWorld(SAMPLE_FARM, loaded)
    stage.addFigure({ id: 'a', tile: { x: 4, z: 2 }, set: 'stand-in-0', loadSet: async () => standInSet(0), face: null })
    stage.addFigure({ id: 'b', tile: { x: 1, z: 2 }, set: 'stand-in-1', loadSet: async () => standInSet(1), face: null })
    stage.addFigure({ id: 'c', tile: { x: 7, z: 14 }, set: 'stand-in-2', loadSet: async () => standInSet(2), face: null })
    stage.scrollTo(z, true)
    for (let i = 0; i < 4; i++) { stage.step(1 / 30); await new Promise((r) => setTimeout(r, 30)) }
    stage.step(1 / 30)
    await save(name, canvas)
    stage.dispose()
  }
  canvas.style.width = '1152px'; canvas.style.height = '720px'
  await shoot('band-1x.png', [1152, 720], 1, 'none', SPRING, 0)
  canvas.style.width = '375px'; canvas.style.height = '812px'
  await shoot('farm-phone.png', [375, 812], 2, 'width', SPRING, 12)
  await shoot('farm-phone-night.png', [375, 812], 2, 'width', NIGHT, 12)
  log('saved band-1x.png, farm-phone.png, farm-phone-night.png')
}
main().catch((e) => log(`failed: ${e instanceof Error ? e.message : String(e)}`))
