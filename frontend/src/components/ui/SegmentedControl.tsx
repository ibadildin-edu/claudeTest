import clsx from 'clsx'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
}

export function SegmentedControl<T extends string>({ value, options, onChange, ariaLabel }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-full bg-cream-300/80 p-1">
      {options.map((option) => {
        const checked = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={clsx(
              'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
              checked ? 'bg-espresso-900 text-cream-50 shadow-sm' : 'text-espresso-500 hover:text-espresso-900',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
