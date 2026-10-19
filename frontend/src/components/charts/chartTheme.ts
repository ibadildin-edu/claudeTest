import type { TooltipContentProps } from 'recharts'
import { palette } from '@/theme/palette'

/** Axis ticks and grid lines shared by all Recharts charts. */
export const axisTick = { fill: palette.espresso[400], fontSize: 12 } as const
export const gridStroke = palette.cream[300]
export const cursorFill = palette.cream[200]

/** The data row under the cursor. Recharts types `payload` as any, so the caller names the type. */
export function getTooltipDatum<T>(props: TooltipContentProps): T | undefined {
  if (!props.active) return undefined
  const datum: unknown = props.payload?.[0]?.payload
  return datum === undefined ? undefined : (datum as T)
}
