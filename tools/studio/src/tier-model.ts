// The tier model lives in packages/tiers (AP15, P128), shared with the Uma Platform app and the sprite queue. The
// Studio's Node code imports it through here; its pages get the package's own built file at /tier-model.js (server.ts),
// which has no imports, so the browser needs no import map.
export * from '@uma-platform/tiers'
