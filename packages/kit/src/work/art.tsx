import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

export interface WorkArt { readonly Item: ComponentType<{ id: string; size: number }> }
const WorkArtContext = createContext<WorkArt>({ Item: ({ id }) => <span aria-hidden>{id.slice(0, 1)}</span> })
export function WorkArtProvider({ art, children }: { art: WorkArt; children: ReactNode }) {
  return <WorkArtContext.Provider value={art}>{children}</WorkArtContext.Provider>
}
export function WorkItem({ id, size = 32 }: { id: string; size?: number }) {
  const { Item } = useContext(WorkArtContext)
  return <span aria-hidden className="inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}><Item id={id} size={size} /></span>
}
