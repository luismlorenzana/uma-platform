import type { Type } from '@nestjs/common'
import { RankerModule } from './ranker/ranker.module'

// The sub-apps' API modules (AP1): each serves /api/<id>/… from its own folder, src/apps/<id>/, and imports nothing from
// another sub-app's folder (checked by scripts/check-sub-apps.test.mjs). Character Art (CA1) registers here next.
export const SUB_APP_MODULES: Type[] = [RankerModule]
