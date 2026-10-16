// A HUD number that moves when it changes (uma-racer's `ui/AnimatedNumber`; P48): the new value slides in by a CSS
// transition (`.kit-number` in theme.css), never a spring; reduced motion swaps it at once. Tabular figures, so counters
// don't jitter.
import { useLayoutEffect, useRef, useState } from 'react'

export function AnimatedNumber({ value, format = (n) => n.toLocaleString('en-US'), className = '' }: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const [entering, setEntering] = useState(false)
  const last = useRef(value)
  useLayoutEffect(() => {
    if (last.current === value) return
    last.current = value
    setEntering(true)
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntering(false))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [value])
  return (
    <span className={`kit-number inline-block tabular-nums ${className}`} data-entering={entering ? '' : undefined}>
      {format(value)}
    </span>
  )
}
