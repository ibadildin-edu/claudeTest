import clsx from 'clsx'
import { useCallback, useMemo, useState, type FocusEvent, type PointerEvent } from 'react'
import type { HeatmapCell } from '@/api/types'
import { formatWeekday } from '@/lib/format'
import { buildHeatmapModel, describeCell, HEAT_CLASSES, heatLevel } from './heatmapModel'

interface HeatmapGridProps {
  cells: readonly HeatmapCell[]
}

interface ActiveCell {
  weekday: number
  hour: number
}

function readCell(target: EventTarget): ActiveCell | null {
  if (!(target instanceof HTMLElement)) return null
  const cell = target.closest<HTMLElement>('[data-weekday]')
  if (!cell) return null
  return { weekday: Number(cell.dataset.weekday), hour: Number(cell.dataset.hour) }
}

/** Weekday × hour grid built with CSS grid: Recharts has no heatmap. */
export function HeatmapGrid({ cells }: HeatmapGridProps) {
  const model = useMemo(() => buildHeatmapModel(cells), [cells])
  const [hovered, setHovered] = useState<ActiveCell | null>(null)

  // One delegated handler for all 112 cells instead of a closure per cell.
  const handlePointerOver = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const cell = readCell(event.target)
    if (cell) setHovered(cell)
  }, [])
  const handleFocus = useCallback((event: FocusEvent<HTMLDivElement>) => {
    setHovered(readCell(event.target))
  }, [])
  const handleLeave = useCallback(() => setHovered(null), [])

  const active = hovered ?? (model.peak ? { weekday: model.peak.weekday, hour: model.peak.hour } : null)
  const activeValue = active ? (model.values[active.weekday]?.[model.hours.indexOf(active.hour)] ?? 0) : 0
  const caption = active ? describeCell(active.weekday, active.hour, activeValue) : 'Нет заказов за период'

  const gridTemplateColumns = `2.25rem repeat(${model.hours.length}, minmax(2.25rem, 1fr))`

  return (
    <div>
      <p aria-live="polite" className="mb-4 inline-flex rounded-full bg-cream-200 px-4 py-1.5 text-sm font-medium">
        {!hovered && model.peak && <span className="mr-1 text-espresso-400">Пик:</span>}
        {caption}
      </p>

      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div
          role="grid"
          aria-label="Загрузка по дням недели и часам"
          className="grid min-w-[40rem] gap-1.5"
          style={{ gridTemplateColumns }}
          onPointerOver={handlePointerOver}
          onPointerLeave={handleLeave}
          onFocus={handleFocus}
          onBlur={handleLeave}
        >
          <div role="row" className="contents">
            <span />
            {model.hours.map((hour) => (
              <span key={hour} role="columnheader" className="pb-1 text-center text-xs text-espresso-400 tabular-nums">
                {String(hour).padStart(2, '0')}
              </span>
            ))}
          </div>

          {model.weekdays.map((weekday) => (
            <div key={weekday} role="row" className="contents">
              <span role="rowheader" className="flex items-center text-sm text-espresso-500">
                {formatWeekday(weekday, 'short')}
              </span>
              {model.hours.map((hour, column) => {
                const value = model.values[weekday]?.[column] ?? 0
                const isActive = active?.weekday === weekday && active.hour === hour
                return (
                  <div
                    key={hour}
                    role="gridcell"
                    tabIndex={-1}
                    data-weekday={weekday}
                    data-hour={hour}
                    aria-label={describeCell(weekday, hour, value)}
                    className={clsx(
                      'h-9 rounded-lg transition-shadow',
                      HEAT_CLASSES[heatLevel(value, model.max)],
                      isActive && 'ring-2 ring-espresso-900 ring-offset-1 ring-offset-cream-50',
                    )}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-espresso-400">
        меньше
        {HEAT_CLASSES.map((className) => (
          <span key={className} aria-hidden className={clsx('size-3.5 rounded', className)} />
        ))}
        больше
      </div>
    </div>
  )
}
