// When the stage was asked for (Q4): the router marks it as the lazy stage chunk starts loading, so the stage's load time
// and its first frame can be measured from the tap. Tiny, in the main bundle.
let requestedAt: number | null = null
export function markStageRequested(): void { requestedAt = performance.now() }
export const stageRequestedAt = (): number | null => requestedAt
