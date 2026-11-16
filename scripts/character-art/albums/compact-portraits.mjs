import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { decodePortraitPNG, composePortraitRGBA } from './portrait-pixels.mjs'

/** Embed the small source library, so the same local page also works from disk without file-URL fetches. */
export async function compactPortraitScript(dir, manifest) {
  const files = [...manifest.assets.map((a) => [a.base, a.baseSha256]), ...manifest.faces.map((f) => [f.file, f.sha256])]
  const pngs = {}, root = path.resolve(dir, '..') + path.sep
  for (const [file, expected] of files) {
    const absolute = path.resolve(dir, file)
    if (!absolute.startsWith(root) || !file.endsWith('.png')) throw Error('Portrait piece must stay inside its character folder')
    const bytes = await readFile(absolute)
    if (createHash('sha256').update(bytes).digest('hex') !== expected) throw Error(`Portrait piece hash mismatch: ${file}`)
    pngs[file] = bytes.toString('base64')
  }
  return `const decodePortraitPNG=${decodePortraitPNG.toString()};
const composePortraitRGBA=${composePortraitRGBA.toString()};
const portraitPNGs=${JSON.stringify(pngs)},portraitCache=new Map(),portraitSequence={left:0,right:0};
function portraitPixels(file){if(!portraitCache.has(file)){const encoded=portraitPNGs[file];if(!encoded)throw Error('Missing portrait piece');portraitCache.set(file,decodePortraitPNG(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))));}return portraitCache.get(file);}
async function renderPortrait(asset,state,face){const base=await portraitPixels(asset.base),layer=state?await portraitPixels(face.file):null,pixels=composePortraitRGBA(base,layer,state?.position??asset.position),expected=state?state.rgbaSha256:asset.rgbaSha256;
const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),n=>n.toString(16).padStart(2,'0')).join('');if(hash!==expected)throw Error('Portrait pixel verification failed');
const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height;canvas.getContext('2d').putImageData(new ImageData(pixels,base.width,base.height),0,0);return{url:canvas.toDataURL('image/png'),hash,expected};}
`
}
