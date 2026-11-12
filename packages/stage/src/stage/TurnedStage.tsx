// The turned stage as a React box (NG6; Q4): a fixed landscape box, turned on an upright phone (or, with
// `layout="portrait"`, a portrait box that never turns; ST2), with its safe areas as CSS variables (--inset-top,
// --inset-right, --inset-bottom, --inset-left) on its own edges. Everything inside turns with it, including fixed-position
// children, since a transformed box contains them. A probe element reads env(safe-area-inset-*).
// Inside it, uma-kit's `KitStage` (0.18, KL1; Q21): the kit's sheets portal into the stage, size by it, slide in from its
// right edge and read drags through its turn.
import { KitStage } from '@luismlorenzana/uma-kit/ui'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { stageLayout, stageTransform, type Insets, type StageLayout, type StageLayoutKind } from './turn.js'

const px = (s: string): number => Number.parseFloat(s) || 0

/** The stage box: `landscape` (uma-quest's, turned on an upright phone) or `portrait` (uma-farm's, never turned; ST2). */
export function TurnedStage({ children, layout: kind = 'landscape' }: { children: (layout: StageLayout) => ReactNode; layout?: StageLayoutKind }) {
  const probe = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<StageLayout>(() => stageLayout(window.innerWidth, window.innerHeight, undefined, kind))

  useLayoutEffect(() => {
    const measure = () => {
      const style = probe.current ? getComputedStyle(probe.current) : null
      const insets: Insets = style
        ? { top: px(style.paddingTop), right: px(style.paddingRight), bottom: px(style.paddingBottom), left: px(style.paddingLeft) }
        : { top: 0, right: 0, bottom: 0, left: 0 }
      setLayout(stageLayout(window.innerWidth, window.innerHeight, insets, kind))
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    window.visualViewport?.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
      window.visualViewport?.removeEventListener('resize', measure)
    }
  }, [kind])

  // No page scroll or rubber-banding under the stage.
  useEffect(() => {
    const root = document.documentElement, before = root.style.overscrollBehavior
    root.style.overscrollBehavior = 'none'
    document.body.style.overflow = 'hidden'
    return () => { root.style.overscrollBehavior = before; document.body.style.overflow = '' }
  }, [])

  const style = {
    position: 'fixed', left: 0, top: 0, width: layout.width, height: layout.height, transform: stageTransform(layout), transformOrigin: '0 0',
    overflow: 'hidden', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
    '--inset-top': `${layout.insets.top}px`, '--inset-right': `${layout.insets.right}px`,
    '--inset-bottom': `${layout.insets.bottom}px`, '--inset-left': `${layout.insets.left}px`,
  } as CSSProperties
  return (
    <>
      <div ref={probe} aria-hidden style={{ position: 'fixed', inset: 0, visibility: 'hidden', pointerEvents: 'none',
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)' }} />
      <div data-stage data-turned={layout.turned || undefined} className="bg-page text-ink" style={style}>
        <KitStage layout={kind} turn={layout.turned ? 90 : 0}>{children(layout)}</KitStage>
      </div>
    </>
  )
}
