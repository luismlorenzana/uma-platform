# Authored original art

Q7 adds the [forest kit](kit-forest/README.md): 37 original terrain, prop and battle assets, with pinned masters,
prompt provenance, a deterministic atlas export and [native/2× reviews](kit-forest/review/index.html).

UA8's 24 masters were generated with the built-in imagegen tool: 16 held-item textures and eight emote bubbles.
No character art or original-game image was used as input. The open books reference their own closed covers;
the drawn bow references the relaxed bow; the seven bubble variants reference the first bubble.
`ua8-prompts.json` records every prompt, reference master, source SHA-256 and measured call duration.
There were 24 successful calls, 1,431.569 seconds summed duration (calls overlap); no CLI or external provider.

`ua8-config.json` pins the selected masters and their source anchors. The export fits each complete silhouette
uniformly to its cell, maps the grip or tail point, keeps antialiasing, zeros unused transparent colour values and
writes the two atlases. It never mirrors, paints a hand or changes a character sprite.

```sh
pnpm art:props
pnpm --filter @uma-platform/authored-art run previews
```

Runtime art is in `packages/art/held` and `packages/art/emote`; the package publishes the small atlases, not these
large masters. Native/2× sheets on dark, light and battle surfaces are in `assets/previews/held-emote-*`.
`http://127.0.0.1:4318/props` is the local gallery. Character attachment sheets stay privately in `content/review/ua8/`.
