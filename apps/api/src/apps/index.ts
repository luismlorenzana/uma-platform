import type { Type } from '@nestjs/common'
import { ArtModule } from './art/art.module'
import { LookModule } from './look/look.module'
import { RankerModule } from './ranker/ranker.module'
import { StoryModule } from './story/story.module'

// The sub-apps' API modules (AP1): each serves /api/<id>/… from its own folder, src/apps/<id>/, and imports nothing from
// another sub-app's folder (checked by scripts/check-sub-apps.test.mjs).
export const SUB_APP_MODULES: Type[] = [RankerModule, ArtModule, StoryModule, LookModule]
