import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hex, ramp } from './color.ts'
import { encodePng } from './png.ts'
import { Mask } from './shape.ts'
import { Sprite } from './sprite.ts'
import { farmWeddingRings } from './farm-wedding-rings.ts'

const size = 32
const poly = Mask.polygon
const oval = Mask.ellipse
const box = (x: number, y: number, w: number, h: number) => Mask.from((px, py) => px >= x && px < x+w && py >= y && py < y+h)
const colour = (s: Sprite, base: string) => s.addRamp(ramp(base, { lift: .48, drop: .32 }))
function shade(s: Sprite, mask: Mask, material: number, level = 4) {
  mask.each((x,y) => {
    const face = mask.get(x-1,y) && mask.get(x,y-1) ? level : Math.min(5,level+1)
    s.paint(x,y,material,mask.get(x+1,y) && mask.get(x,y+1) ? face : face-1)
  })
}
function begin() {
  const s = new Sprite()
  s.shadow = { cx:16,cy:26,rx:11,ry:1.5,alpha:53 }
  return s
}

interface Recipe { id: string; name: string; ingredients: string[] }
const recipes: readonly Recipe[] = JSON.parse(readFileSync(new URL('./farm-restaurant.json',import.meta.url),'utf8'))
const ingredients: Readonly<Record<string,string>> = {
  carrot:'#d77b31', 'beet-sugar':'#a33764', tomato:'#d34e3b', 'bell-pepper':'#d68138',
  potato:'#d6aa62', oats:'#cfb67d', 'rolled-oats':'#bfa479', cabbage:'#8db45a', asparagus:'#689453',
  basil:'#679f58', mint:'#57a585', 'dried-basil':'#638e55', rosemary:'#6c8e61', thyme:'#788951',
  onion:'#ceae8e', apple:'#bb4f3f', pear:'#bcc56e', peach:'#eba277', plum:'#815784', orange:'#ed9c37',
  grape:'#8460a1', mango:'#eabb42', pomegranate:'#ad405e', egg:'#e9bc53', 'duck-egg':'#e6a85b',
  milk:'#e7dcc3','goat-milk':'#eddfb5', trout:'#b86f53', carp:'#b48e59', sardine:'#849ca4',
  'trout-fillet':'#d78f65', 'carp-fillet':'#a98553', 'sardine-fillet':'#8e9eaa',
  mackerel:'#7889a0','mackerel-fillet':'#76928f', salmon:'#e48d63', eel:'#825844',
  'sea-bream':'#c37f6a', 'sea-bream-fillet':'#e5a485', tuna:'#ae525b','tuna-fillet':'#b25865',
  shiitake:'#976347', 'button-mushroom':'#c5a680', 'oyster-mushroom':'#b8a284',
  chanterelle:'#d9a04e', enoki:'#e5d8b8', morel:'#7d5d49', porcini:'#a37557',
  chocolate:'#80543c', 'emperor-pumpkin':'#d7944c', 'saffron-threads':'#d7a036',
}
const finishers = ['#e4c47a','#9bb469','#de7252','#e6d9b4','#a1838b','#7ba787'] as const
const ceramics = ['#9db7ad','#91b7c8','#bebdda','#dac0a2','#abc2d3','#dbc29a','#cdb7bd','#95b69e'] as const
const liquid = /broth|soup|stock|stew|cream$|glaze$|syrup|gravy|sauce/
const baked = /tart|pie|pastry|crust|turnover|galette|cake|loaf|flatbread|crisp|toast|braid|parcel|roll|square|slice/
const bowl = /bowl|custard|pudding|filling|compote|chutney|crumble|pilaf|cup|poached/
const fish = /carp|trout|salmon|sardine|mackerel|tuna|eel|bream|fillet/
function dish(recipe: Recipe, index: number) {
  const s = begin(), name = recipe.name.toLowerCase()
  const course = index % 15
  const stage = Math.floor(index / 15)
  const ceramic = colour(s, ceramics[stage]!)
  const mainId = recipe.ingredients[0] ?? ''
  const main = colour(s, ingredients[mainId] ?? finishers[index % finishers.length]!)
  const side = colour(s, ingredients[recipe.ingredients[1] ?? ''] ?? finishers[(course+2)%finishers.length]!)
  const crust = colour(s,'#bc7e47'), herb = colour(s,'#719250'), cream = colour(s,'#e7caa1')
  const deep = liquid.test(name) || bowl.test(name)
  const pan = /skillet|bake|roast|gratin|tray|board/.test(name)
  if (pan) {
    shade(s,poly([[4,13],[25,12],[29,16],[26,24],[7,25],[3,21]]),ceramic,3)
    shade(s,poly([[6,15],[24,14],[27,17],[25,22],[8,23],[5,20]]),ceramic,4)
  } else {
    shade(s,oval(16,19,13,deep?8:7),ceramic,3)
    shade(s,oval(16,18,11,deep?5.7:5),ceramic,4)
  }
  const lean = (course % 5 - 2) * 4
  if (liquid.test(name)) {
    shade(s,oval(16,17,9.7,4.7),main,3)
    for (let k=0;k<3;k++) shade(s,oval(9+k*5+(course%2),16+(k+course)%3,1.9,1),k===1?cream:side)
  } else if (baked.test(name)) {
    const open = /tart|galette|shell|pie/.test(name)
    const group = /toast|crisp|square|parcel|roll|cake/.test(name)
    if (open) {
      shade(s,oval(16,16,9.5,6.2,lean),crust)
      shade(s,oval(16,15.2,7.6,4.3,lean),main,3)
      if (/pie/.test(name)) for (const x of [11,15,19]) shade(s,oval(x,14,1.1,4,25),crust,4)
    } else if (group) {
      for (let k=0;k<2+(course%2);k++) {
        const x=11+k*5, y=16+(k+course)%3
        shade(s,poly([[x-4,y-1],[x+3,y-3],[x+5,y+2],[x-2,y+5]]),crust,3)
        shade(s,oval(x,y,3.1,2,lean),main)
      }
    } else {
      shade(s,poly([[7,18],[10,11],[23,12],[26,17],[23,22],[9,22]]),crust)
      for (const x of [12,16,20]) shade(s,oval(x,15,1.4,3.6,32),main,4)
    }
  } else if (fish.test(name)) {
    shade(s,poly([[6,18],[11,12],[19,11],[23,14],[27,12],[24,19],[17,22],[10,22]]),main,3)
    for (const x of [12,16,20]) shade(s,oval(x,16+(course%3),1,2.7,29),crust,2)
    shade(s,oval(21,20,3.8,1.8,-13),side,4)
  } else if (bowl.test(name)) {
    shade(s,oval(16,17,9.6,4.6),main,3)
    for (let k=0;k<5;k++) shade(s,oval(10+k*2.8,15+(k*course)%4,1.3,1.1),k%2===0?side:cream,4)
  } else {
    const ribbon = /ribbon|dress|asparagus/.test(name)
    for (let k=0;k<3+course%2;k++) {
      const x=9+k*4.5, y=15+(k+course)%4
      shade(s,oval(x,y,ribbon?4:3.7,ribbon?1.4:2.5,lean+(ribbon?38*k:12*k)),k===2?side:main,4)
    }
  }
  // Fresh garnish is part of the plating. Its type follows the ingredients, its placement the recipe.
  const garnish = /honey|custard|syrup|crumble|fruit|sugar/.test(name) ? cream : herb
  for (let k=0;k<2+course%3;k++) {
    const x=8+(course*3+k*7)%16, y=13+(course+k*3)%8
    shade(s,oval(x,y,1.55,0.8,course*13+k*21),garnish,5)
  }
  return s.render()
}

const conversions = {
  'cultured-yogurt':['pot','#f7eed6','#93a8c5'], butter:['block','#e5bf65','#d9a54f'],
  'farm-cheese':['wedge','#efc25a','#c28b4c'], 'goat-cheese':['round','#e8dfc9','#8d9f8c'],
  'carrot-pickles':['jar','#d37c46','#879a52'], 'preserved-egg':['egg','#796157','#e2a26c'],
  'preserved-duck-egg':['egg','#4e655a','#d38761'], 'tomato-sauce':['bottle','#c7433d','#85a05f'],
  'strawberry-jam':['jar','#bf5267','#d38694'], 'raspberry-jam':['jar','#833e65','#c88c95'],
  'blueberry-jam':['jar','#554d9a','#839bc1'], 'persimmon-preserve':['jar','#db8844','#bd994e'],
} as const
function conversion([form, body, lid]: readonly string[]) {
  const s=begin(), food=colour(s,body!), trim=colour(s,lid!), label=colour(s,'#e8dfc7')
  if (form==='block' || form==='wedge') {
    const face=form==='block' ? [[5,14],[20,8],[28,13],[27,23],[12,26],[5,21]] as const
      : [[6,21],[12,7],[25,12],[28,23],[12,27]] as const
    shade(s,poly(face),food)
    shade(s,poly([[6,21],[12,18],[27,19],[27,23],[12,27]]),trim,3)
    if (form==='wedge') for (const [x,y] of [[13,12],[19,14],[16,18]]) shade(s,oval(x!,y!,1.3,1),trim,2)
  } else if (form==='egg' || form==='round') {
    shade(s,oval(16,17,form==='egg'?8:11,form==='egg'?11:7,form==='egg'?-25:0),food,3)
    shade(s,oval(17,18,6,5,-18),trim)
    shade(s,oval(16,17,3,2.7),label,4)
  } else {
    const slender=form==='bottle'
    shade(s,poly(slender?[[13,7],[19,7],[20,12],[23,16],[23,26],[9,26],[9,16],[12,12]]
      :[[8,8],[24,8],[26,13],[25,25],[22,27],[10,27],[7,24],[6,13]]),food,3)
    shade(s,box(slender?12:7,6,slender?8:18,4),trim,4)
    shade(s,box(slender?10:9,16,slender?12:14,6),label)
    shade(s,oval(16,19,3.3,2.4),food,4)
    shade(s,oval(17,17,1.7,.75,-32),trim,4)
  }
  return s.render()
}

const tools=['watering-can','hoe','brush','pick','hammer','rod','axe'] as const
const tiers=['#818780','#b57452','#94a6b1','#648ca3','#b88e61'] as const
function tool(id: typeof tools[number], tier: number) {
  const s=begin(), metal=colour(s,tiers[tier-1]!), wood=colour(s,'#a2754e'), linen=colour(s,'#d5b38e')
  const long = poly([[6,25],[9,28],[24,8],[22,6]])
  if(id==='watering-can') {
    shade(s,oval(22,15,6,7).subtract(oval(22,15,3.8,4.4)),metal)
    shade(s,poly([[3,9],[7,9],[13,17],[11,20],[6,15],[2,12]]),metal)
    shade(s,poly([[12,12],[23,12],[26,23],[22,26],[11,26],[9,22]]),metal)
    shade(s,oval(17,12,5,1.8),metal,1)
  } else if(id==='brush') {
    shade(s,poly([[6,19],[19,6],[24,7],[24,12],[15,23],[8,24]]),wood)
    shade(s,oval(11,21,7,4,-37),metal)
    for (const x of [5,8,11,14]) shade(s,oval(x,25-(x-5)*.48,1.5,3.3,24),linen)
  } else if(id==='rod') {
    shade(s,poly([[4,27],[7,29],[28,5],[27,4]]),wood)
    shade(s,oval(12,20,3.6,3),metal)
    shade(s,oval(12,20,1.6,1.4),linen)
    shade(s,poly([[27,5],[28,5],[24,19],[23,19]]),linen)
  } else {
    shade(s,long,wood)
    const heads = {
      hoe:[[17,8],[25,4],[29,6],[28,10],[21,11],[18,15],[16,13]],
      pick:[[10,10],[15,6],[22,5],[29,10],[28,12],[22,9],[16,9],[11,12]],
      hammer:[[16,5],[26,5],[28,9],[27,14],[17,14],[14,11]],
      axe:[[19,5],[24,4],[29,6],[29,14],[26,18],[20,14],[17,10]],
    } as const
    shade(s,poly(heads[id]),metal,tier===5?4:3)
    if (tier>=3) shade(s,oval(21,10,2.1,.8,-15),linen,4)
  }
  if (tier>=2) {
    for(let x=0;x<tier-1;x++) s.overlay(5+x*2,29,hex(tiers[tier-1]!))
  }
  return s.render()
}

const jewels=['earrings','necklace','bracelet','brooch'] as const
function jewel(id: typeof jewels[number]) {
  const s=begin(), gold=colour(s,'#d2a659'), gem=colour(s,'#719991'), rose=colour(s,'#ce8e86')
  if(id==='earrings') {
    for (const x of [11,22]) {
      shade(s,oval(x,10,4,5).subtract(oval(x,10,2.35,3.45)),gold)
      shade(s,poly([[x,13],[x+4,19],[x,24],[x-4,19]]),gem)
    }
  } else if(id==='necklace') {
    shade(s,poly([[4,6],[6,6],[16,18],[26,6],[28,6],[16,21]]),gold)
    shade(s,poly([[16,16],[21,21],[16,28],[11,21]]),rose)
  } else if(id==='bracelet') {
    shade(s,oval(16,17,12,7,-11).subtract(oval(16,16.5,8.7,4.2,-11)),gold)
    for (const [x,y] of [[8,20],[13,22],[18,22],[24,20]]) shade(s,oval(x!,y!,1.75,1.65),gem)
  } else {
    shade(s,oval(16,16,10.9,9.6,-24),gold)
    shade(s,oval(16,16,8.3,6.9,-24),gem,2)
    for (const [x,y,turn] of [[11,16,-35],[17,12,30],[21,16,65]]) shade(s,oval(x!,y!,3.45,1.5,turn!),rose)
    shade(s,oval(16.5,20,2.2,2),gold)
  }
  return s.render()
}

function farmBuilding(id: string) {
  const s=begin(), timber=colour(s,'#8e6042'), cream=colour(s,'#d5b989'), sage=colour(s,'#5c816a')
  const brick=colour(s,'#ab6d55'), water=colour(s,'#5195a2'), glass=colour(s,'#61798e')
  if (id==='dock') {
    shade(s,oval(16,20,13,8,-6),water,3)
    shade(s,poly([[6,13],[12,11],[27,19],[20,22]]),cream)
    for(const [x,y] of [[8,11],[12,12],[19,18],[24,19]]) shade(s,box(x!,y!,2,7),timber,3)
  } else if (id==='boat') {
    shade(s,oval(16,23,14,5),water,3)
    shade(s,poly([[3,18],[28,16],[25,24],[10,26],[5,23]]),timber)
    shade(s,poly([[6,17],[25,15],[24,19],[9,21]]),cream)
    shade(s,box(14,6,2,13),timber)
    shade(s,poly([[15,6],[24,15],[15,16]]),cream)
  } else if (id==='board') {
    shade(s,box(6,11,2,16),timber)
    shade(s,box(24,11,2,16),timber)
    shade(s,box(6,10,20,11),timber)
    shade(s,poly([[4,10],[9,5],[23,5],[28,10]]),sage)
    for(const [x,y,h] of [[9,12,5],[15,11,7],[21,13,5]]) shade(s,box(x!,y!,3,h!),cream)
  } else {
    const house = (x:number,y:number,w:number,h:number, roof:number) => {
      shade(s,box(x,y,w,h),cream)
      shade(s,poly([[x-2,y+1],[x+w*.52,y-7],[x+w+2,y+1]]),roof)
      shade(s,box(x+w*.45,y+h-6,4,6),timber)
      shade(s,box(x+2,y+3,3,3),glass)
    }
    if(id==='town') {
      house(5,13,9,12,brick)
      house(16,10,10,14,sage)
      shade(s,oval(17,26,9,2.8),water)
    } else if(id==='coop') {
      house(6,13,14,10,sage)
      shade(s,poly([[15,20],[18,20],[24,27],[20,28]]),timber)
      for (const x of [3,24,28]) shade(s,box(x,19,1.5,8),cream)
      shade(s,box(22,23,7,1.4),timber)
    } else {
      house(5,13,21,12,brick)
      shade(s,poly([[6,18],[12,9],[19,17],[23,13],[27,19]]),sage)
      shade(s,box(21,19,4,6),glass)
    }
  }
  return s.render()
}

const cells = [
  ...farmWeddingRings(),
  ...Object.entries(conversions).map(([id,row]) => ({ id, rgba: conversion(row) })),
  ...tools.flatMap(id => tiers.map((_,i) => ({ id: `tool/${id}/tier-${i+1}`, rgba: tool(id,i+1) }))),
  ...jewels.map(id => ({ id: `heirloom/${id}`, rgba: jewel(id) })),
  ...recipes.map((entry,i) => ({ id: entry.id, rgba: dish(entry,i) })),
  ...["coop","board","dock","expeditions","town","boat"].map(id => ({id:"building/"+id,rgba:farmBuilding(id)})),
]
const columns=12, width=columns*size, height=Math.ceil(cells.length/columns)*size
const rgba=new Uint8Array(width*height*4)
const frames: Record<string,{x:number;y:number}> = {}
const hashes=new Set<string>()
for (const [{id,rgba:tile},index] of cells.map((entry,i)=>[entry,i] as const)) {
  const hash=createHash('sha256').update(tile).digest('hex')
  if (frames[id] || hashes.has(hash)) throw new Error(`Repeated Farm art for ${id}`)
  hashes.add(hash)
  const x=(index%columns)*size, y=Math.floor(index/columns)*size
  frames[id]={x,y}
  for(let row=0;row<size;row++) rgba.set(tile.subarray(row*size*4,(row+1)*size*4),((y+row)*width+x)*4)
}
const out=fileURLToPath(new URL('../../../packages/art/farm-items/',import.meta.url))
mkdirSync(out,{recursive:true})
writeFileSync(out+'atlas.png',encodePng(width,height,rgba))
writeFileSync(out+'atlas.json',JSON.stringify({schemaVersion:1,cell:size,width,height,frames},null,2)+'\n')
