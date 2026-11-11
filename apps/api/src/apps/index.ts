import type { Type } from '@nestjs/common'

// The sub-apps' API modules (AP1): each serves /api/<id>/… from its own folder, src/apps/<id>/, and imports nothing from
// another sub-app's folder (checked by boundaries.test.ts). The Ranker (RK1) and Character Art (CA1) register here.
export const SUB_APP_MODULES: Type[] = []
