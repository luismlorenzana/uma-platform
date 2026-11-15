# Enemy study brief: <enemy> · <study>-v00N

Save the filled brief in the study folder, `content/authoring/character-universes/cyberpunk/enemies/<faction>/<study>-v00N/brief.md`
(gitignored). Names belong here, never in git.

## The study

- Owner's request and date: `<...>`
- Enemy and unit id: `<...>` · Faction: `<...>` · Rank: `<boss / key / regular>` · Role: `<...>`
- Look: `<boss / hold / helmet / combat-station / ...>`
- What this study tries: `<one main change from the last round>`

## Inputs

| Input | File | SHA-256 | Role |
| --- | --- | --- | --- |
| Face | `../<enemy>/references/<...>` | `<...>` | Identity, first |
| Art | `../<enemy>/references/<...>` | `<...>` | Identity |
| Splash | `../<enemy>/references/<...>` | `<...>` | Identity, when there is one |
| Shared anchor | `<...>` | `<...>` | The Standard or the approved uniform |

## What to keep, what changes

| | Keep | Change |
| --- | --- | --- |
| Her | `<face, hair, eyes, head ornaments>` | `<...>` |
| The faction | `<base, trim, emblem, silhouette from kit.md>` | `<...>` |
| The Standard | `<construction, rendering, staging>` | — |

## Outputs

| Image | Prompt | SHA-256 | Verdict |
| --- | --- | --- | --- |
| `images/<...>.png` | `prompts/<...>.txt` | `<...>` | `<pending / approved, date, words>` |
