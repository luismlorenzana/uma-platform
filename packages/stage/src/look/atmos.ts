// The look bible's atmosphere and motion (rule 9) and the rest of LK1's layers: height fog, wind on foliage, light
// shafts, embers, and a staged rim on the characters. Each is cheap enough for the phone: shader patches, a few
// additive cards, a few hundred points.
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, NearestFilter, PlaneGeometry, Points,
  PointsMaterial, Quaternion, ShaderChunk, Vector3, type Material, type MeshStandardMaterial,
} from 'three'

/** Height fog: three's exponential fog, thicker near the ground and thinning with height, so haze pools in the
 * distance's low ground and the tree line fades from the bottom up (ref-03, ref-04). Patched into the shared chunks once,
 * before anything compiles: world height comes from the view matrix, so every built-in material gets it. */
export const HEIGHT_FOG = { falloff: 7.0, ground: 1.5, top: 0.5 }
let fogInstalled = false
export function installHeightFog(): void {
  if (fogInstalled) return
  fogInstalled = true
  ShaderChunk.fog_pars_vertex = '#ifdef USE_FOG\n\tvarying float vFogDepth;\n\tvarying float vFogHeight;\n#endif'
  // mvPosition = R·p + t, so p = Rᵀ·(mvPosition − t).
  ShaderChunk.fog_vertex = '#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z;\n\tvFogHeight = ( transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz ) ).y;\n#endif'
  ShaderChunk.fog_pars_fragment = ShaderChunk.fog_pars_fragment.replace('varying float vFogDepth;', 'varying float vFogDepth;\n\tvarying float vFogHeight;')
  ShaderChunk.fog_fragment = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	fogFactor = min( 1.0, fogFactor * mix( ${HEIGHT_FOG.top.toFixed(3)}, ${HEIGHT_FOG.ground.toFixed(3)}, exp( - max( vFogHeight, 0.0 ) / ${HEIGHT_FOG.falloff.toFixed(3)} ) ) );
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`
}

/** The wind's clock, shared by every swaying material. */
export const WIND = { value: 0 }
/** Leaves, flowers and grass sway with height above their own base: two sines, phased by world position. */
export function windy(mat: Material, strength: number): void {
  const m = mat as MeshStandardMaterial
  if (m.userData.windy) return
  m.userData.windy = strength
  m.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = WIND
    shader.vertexShader = 'uniform float windTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        vec4 wp = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        wp = modelMatrix * wp;
        float sway = sin(windTime * 1.6 + wp.x * 0.35 + wp.z * 0.21) + 0.45 * sin(windTime * 3.9 + wp.x * 1.3 - wp.z * 0.7);
        float lift = max(position.y, 0.0);
        transformed.x += sway * ${strength.toFixed(4)} * lift;
        transformed.z += sway * ${(strength * 0.45).toFixed(4)} * lift;
      }`)
  }
  m.customProgramCacheKey = () => `wind${strength}`
  m.needsUpdate = true
}

/** The characters' staged light (Octopath's spotlight, LK1 layer 3): a warm rim on the side the key comes from, read off
 * the silhouette normal map in texture space, so it sits on the outline whatever the camera does. */
export const RIM = { strength: { value: 0.75 }, dir: { value: [-0.62, 0.78] }, colour: { value: new Color('#ffd9a0') } }
export function rimmed(mat: MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.rimStrength = RIM.strength
    shader.uniforms.rimDir = RIM.dir
    shader.uniforms.rimColour = RIM.colour
    shader.fragmentShader = 'uniform float rimStrength; uniform vec2 rimDir; uniform vec3 rimColour;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', `
      #ifdef USE_NORMALMAP_TANGENTSPACE
        float rimEdge = smoothstep(0.08, 0.4, length(mapN.xy));
        float rimSide = max(dot(normalize(mapN.xy + vec2(1e-5)), normalize(rimDir)), 0.0);
        outgoingLight += rimColour * diffuseColor.rgb * rimEdge * rimSide * rimStrength;
      #endif
      #include <opaque_fragment>`)
  }
  mat.customProgramCacheKey = () => 'rim'
}

/** Light shafts: a few long additive cards along the sun's direction, in the haze behind the square (ref-03, ref-08). */
export function shafts(sunFrom: Vector3, spots: [number, number, number][], colour = '#ffe2b4', opacity = 0.09, length = 30): Group {
  const c = document.createElement('canvas')
  c.width = 16; c.height = 64
  const g = c.getContext('2d')!
  for (let y = 0; y < 64; y++) for (let x = 0; x < 16; x++) {
    const along = Math.sin((y / 63) * Math.PI), across = Math.max(0, 1 - Math.abs(x - 7.5) / 8) ** 1.5
    g.fillStyle = `rgba(255,255,255,${(along * across).toFixed(3)})`
    g.fillRect(x, y, 1, 1)
  }
  const tex = new CanvasTexture(c)
  tex.magFilter = NearestFilter
  const mat = new MeshBasicMaterial({ map: tex, color: colour, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })
  const up = sunFrom.clone().normalize(), q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), up)
  const out = new Group()
  for (const [x, y, z] of spots) {
    for (let k = 0; k < 2; k++) {
      const m = new Mesh(new PlaneGeometry((2.6 - k) * Math.min(1, length / 12), length), mat)
      m.quaternion.copy(q)
      m.rotateY(k * Math.PI / 2)
      m.position.set(x + k * 0.8, y, z)
      m.renderOrder = 2
      out.add(m)
    }
  }
  return out
}

/** Embers rising from a fire: points that climb, drift and fade back to the bowl. */
export interface Embers { points: Points; sources: Vector3[] }
export function embers(sources: Vector3[], perSource = 36, colour = '#ffb060'): Embers {
  const n = sources.length * perSource, pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { const s = sources[i % sources.length]!; pos.set([s.x, s.y + Math.random() * 3, s.z], i * 3) }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  const points = new Points(geo, new PointsMaterial({ color: colour, size: 0.07, transparent: true, opacity: 0.95, depthWrite: false, blending: AdditiveBlending }))
  return { points, sources }
}
export function stepEmbers(e: Embers, t: number, dt: number): void {
  const p = e.points.geometry.getAttribute('position') as BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const s = e.sources[i % e.sources.length]!
    let x = p.getX(i) + dt * 0.35 * Math.sin(t * 2.1 + i), y = p.getY(i) + dt * (0.7 + (i % 5) * 0.12), z = p.getZ(i) + dt * 0.25 * Math.cos(t * 1.7 + i * 1.3)
    if (y > s.y + 2.6 + (i % 7) * 0.2) { x = s.x + (Math.random() - 0.5) * 0.3; y = s.y; z = s.z + (Math.random() - 0.5) * 0.3 }
    p.setXYZ(i, x, y, z)
  }
  p.needsUpdate = true
}
