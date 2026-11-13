---
'@luismlorenzana/uma-stage': minor
---

ST5 and ST6 (P156), each opt-in, so a game that uses neither draws and plays as on 0.4.0:

- ST5 (uma-cyberpunk's CY7, its D11): `new Effects(renderer, scene, camera, { bloom?: { strength, radius, threshold },
  tiltShift?: { strength, focus } | false })`, each value falling back to `BLOOM` and `TILT_SHIFT`; `effects.set(…)`
  changes the given values live; `effects.settings`. With no options, the same passes and uniforms as before.
- ST6 (uma-farm F12's request, its D77): `BandStage.emote(id, name): Promise<boolean>` plays one action once on a live
  sprite figure, then back to her stance; false for a standee, a set not live, an unknown action, a walking figure or an
  unknown id; cut short by a walk, a placing, a removal, a new set or a rebuild that doesn't keep her; it counts as
  motion for `onSettled` and `atRest`. `debug.figures` gains `action` and `emote`.
