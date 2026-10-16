// A row of two to four tabs at 44 pt (uma-racer's `ui/Tabs`, its T138; P48): a sunken track with the chosen tab raised.
// Selection moves by a CSS transition on the raised face, never a spring.
export function Tabs<T extends string>({ options, value, onChange, label, className = '' }: {
  options: readonly { readonly value: T; readonly label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  return (
    <div role="tablist" aria-label={label} className={`flex gap-1 rounded-sm bg-sunken p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`min-h-11 flex-1 rounded-xs px-1 text-[13px] font-semibold transition-colors ${active ? 'bg-panel text-ink shadow-1' : 'text-ink-soft'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
