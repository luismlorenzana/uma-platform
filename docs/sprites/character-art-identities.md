# Character and outfit art identities

Schema and uma-data 1.10.0 let an outfit's authored identity coexist with its original character's dialogue portraits and illustrations. This is useful when a game's cast treats an alternate outfit as a separate person. That interpretation stays in the game adapter.

| Selection | Art-index key | Family manifest |
| --- | --- | --- |
| Original character | `<characterId>` | `characterId` |
| Outfit-specific identity | `outfit:<outfitId>` | `characterId` and optional `outfitId` |

The numeric character remains the real master-data character. The outfit belongs to that character in the `outfits` set. Original entries and filenames keep their existing format. The new entries use `outfit-<id>` filename stems. Older 1.x readers continue to read the original entries and ignore the additional manifest field.

`client.dialoguePortraits(manifest, art, characterId, outfitId?)` and `client.illustrations(manifest, art, characterId, outfitId?)` select the exact identity. They validate both IDs and every referenced image's release hash. An absent outfit entry returns null, with no fallback to another identity's art.

## Private authoring aliases

The packers and profile publisher read optional `content/authoring/art-identities/<universe>.json`:

```json
{
  "universe": "invented-universe",
  "identities": {
    "invented-sister": { "characterId": 9001, "outfitId": 900102 }
  }
}
```

Keys match authored names by the same normalized name key as Character Art. Each alias must name an existing character and one of her real outfits, and cannot shadow a master-data character name. Actual names and mapping records stay in ignored `content/`.

A scoped packing stage must include hash-verified `characters` and `outfits` sets when aliases are configured. Inspect both resulting family maps before publication. A selected release merges only its named keys into `latest`, preserving the original character entries. `release:check` resolves every key against the neutral sets and checks the corresponding client selection, including profile thumbnails.
