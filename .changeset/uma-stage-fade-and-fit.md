---
"@luismlorenzana/uma-stage": minor
---

ST3 (P146; uma-farm F11's stage request, its D68): two `BandStage` options, off unless asked, so uma-quest is unchanged.
`fade` fades a building (with its mounted pieces) or a blocking prop to 0.35 while it covers a figure, her bubble's
anchor or a marker of the named kinds (slot, gate, lot), easing over 150 ms (at once with reduced motion);
`setFadeMarkers` changes which markers count. `fit: 'width'` scales the camera down so the design's width fills a
narrower canvas (a 2× phone), never up, with the kit mipmapped only while scaled. Also `buildWorldParts`, the fade's pure
half (`farmOccluders`, `coveringOccluders`, `stepFade`, `fitScale`) and a `scale` on picking's `View`.
