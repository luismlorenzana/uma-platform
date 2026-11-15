---
"@luismlorenzana/uma-data": minor
---

Profile pictures (uma-farm F88, P180): each dialogue portrait base may carry a `profile`, a 192 px square lossy WebP of it
around her face, `{ path, width, height, bytes, sha256, crop: { left, top, size } }`. `client.dialoguePortraits` checks
each against the release; `dialogueProfileFor(portraits, outfit)` picks that outfit's, else her first in Farm Life's
order that has one. `syntheticDialoguePortraits(…, { profiles: true })` for tests. Older readers ignore the field.
