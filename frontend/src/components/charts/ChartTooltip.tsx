import type { ReactNode } from 'react'
import { ColorDot } from '@/components/ui/ColorDot'

export interface ChartTooltipRow {
  label: string
  value: string
  color?: string
}

interface ChartTooltipProps {
  title: ReactNode
  rows: readonly ChartTooltipRow[]
}

/** Shared look of Recharts tooltips (passed through the `content` prop). */
export function ChartTooltip({ title, rows }: ChartTooltipProps) {
  return (
    <div className="min-w-44 rounded-xl border border-cream-300 bg-cream-50 px-3.5 py-3 text-sm shadow-card">
      <p className="mb-1.5 font-bold">{title}</p>
      <dl className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-espresso-500">
              {row.color && <ColorDot color={row.color} />}
              {row.label}
            </dt>
            <dd className="font-semibold tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
