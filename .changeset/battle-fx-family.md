---
"@luismlorenzana/uma-art": minor
---

Add the `fx` atlas family: 60 original 32×32 frames, four target-local hit poses and two idle familiar poses for
each of Greatsword, Axe, Lance, Bow, Katana, Fire, Ice, Lightning, Light and Dark. Element colours match D86.

Frame ids are `hit/<kind>-0…3` and `familiar/<kind>-0…1`. The JSON includes kind, group, frame number and centre
anchors (16,16); all object outlines stay inside their cutout, with bounded glow. Final hit poses remain readable
as static reduced-motion effects. Familiars are spectral Arms, a salamander, ice wisp, thunder hawk, light sprite
and shadow cat. The game owns playback speed and summon lifecycle; it must retain its procedural fallback.
