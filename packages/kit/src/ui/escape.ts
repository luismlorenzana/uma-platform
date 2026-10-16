// Which open sheet answers Escape (0.1.2): the one opened last. Each sheet's listener runs in registration order, so
// without this a lower sheet could close first when two are open.
const open: symbol[] = []

/** Marks a sheet open; `isTop` says whether it is the topmost, and `close` takes it off the stack. */
export function openEscapeLayer(): { readonly isTop: () => boolean; readonly close: () => void } {
  const id = Symbol('sheet')
  open.push(id)
  return {
    isTop: () => open.at(-1) === id,
    close: () => {
      const at = open.indexOf(id)
      if (at >= 0) open.splice(at, 1)
    },
  }
}
