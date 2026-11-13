---
'@luismlorenzana/uma-stage': minor
---

ST4 (uma-farm F12's stage request, its D71; P154), each opt-in, so a game that uses none runs as on 0.3.0:

- `BandStage.setFadeFigures(ids | (figure) => boolean)`: which figures count for the fade, beside `setFadeMarkers`.
- `setWorld(design, kit, { keepCamera, keepWalks })`: the camera stays through a rebuild; a walk whose tiles still stand
  keeps going (`pathStands`), any other stops and resolves false.
- `onSettled` and `atRest`: told once each time the stage comes to rest, after that frame is drawn (the saver's pacing
  never skips it); `stop({ draw: true })` draws the current state before stopping.
- `farmProblems`, `standInFarmAtlas` and `SAMPLE_FARM` from the three-free `formats` entry (ESM and CommonJS).
- Fix: a fade part first drawn opaque now visibly fades (its materials recompile when the fade toggles).
