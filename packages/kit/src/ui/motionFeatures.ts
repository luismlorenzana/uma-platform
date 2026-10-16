// Motion's animation features, loaded by <LazyMotion> on its own (uma-racer's `ui/motionFeatures.ts`): importing them
// from this module, not from 'motion/react' itself, lets the bundler keep them out of a game's entry chunk.
export { domMax as default } from 'motion/react'
