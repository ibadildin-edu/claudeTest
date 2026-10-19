import type { HeatmapCell } from '@/api/types'
import { formatHourRange, formatNumber, formatWeekday, pluralize } from '@/lib/format'

/** Full class names, so Tailwind finds them in the source. */
export const HEAT_CLASSES = [
  'bg-heat-0',
  'bg-heat-1',
  'bg-heat-2',
  'bg-heat-3',
  'bg-heat-4',
  'bg-heat-5',
  'bg-heat-6',
  'bg-heat-7',
] as const

export interface HeatmapModel {
  weekdays: number[]
  hours: number[]
  /** `values[weekday][hourIndex]`, average orders per hour. */
  values: number[][]
  max: number
  peak: HeatmapCell | null
}

export function buildHeatmapModel(cells: readonly HeatmapCell[]): HeatmapModel {
  const hours = [...new Set(cells.map((cell) => cell.hour))].sort((a, b) => a - b)
  const weekdays = [0, 1, 2, 3, 4, 5, 6]
  const values = weekdays.map(() => hours.map(() => 0))
  let peak: HeatmapCell | null = null

  for (const cell of cells) {
    const row = values[cell.weekday]
    const column = hours.indexOf(cell.hour)
    if (!row || column === -1) continue
    row[column] = cell.avgOrders
    if (cell.avgOrders > 0 && (!peak || cell.avgOrders > peak.avgOrders)) peak = cell
  }

  return { weekdays, hours, values, max: peak?.avgOrders ?? 0, peak }
}

export function heatLevel(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0
  return Math.max(1, Math.min(HEAT_CLASSES.length - 1, Math.ceil((value / max) * (HEAT_CLASSES.length - 1))))
}

/** «вторник, 15:00–16:00 · ≈ 16 заказов в час». */
export function describeCell(weekday: number, hour: number, avgOrders: number): string {
  const count = avgOrders >= 10 ? Math.round(avgOrders) : avgOrders
  const orders = pluralize(count, { one: 'заказ', few: 'заказа', many: 'заказов' })
  return `${formatWeekday(weekday, 'long')}, ${formatHourRange(hour)} · ≈ ${formatNumber(count, 1)} ${orders} в час`
}
