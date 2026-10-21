import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import {
  Bar,
  BarChart,
  LabelList,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type LabelProps,
  type TooltipContentProps,
  type YAxisTickContentProps,
} from 'recharts'
import { useGetTopProductsQuery } from '@/api/analyticsApi'
import type { AnalyticsParams } from '@/api/types'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { cursorFill, getTooltipDatum } from '@/components/charts/chartTheme'
import { Card } from '@/components/ui/Card'
import { CardHeader } from '@/components/ui/CardHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useLivePolling, useLiveStatus } from '@/features/live/useLive'
import { formatMoney, formatNumber } from '@/lib/format'
import { palette } from '@/theme/palette'

interface TopProductsChartProps {
  params: AnalyticsParams
  limit?: number
}

interface ProductBar {
  rank: number
  name: string
  quantity: number
  revenue: number
  color: string
}

const ROW_HEIGHT = 40
const NAME_AXIS_WIDTH = 190
const VALUE_COLUMN_WIDTH = 64
/** The chart has no left margin, so the name axis starts at x = 0 of the SVG. */
const TICK_LEFT = 4

export const TopProductsChart = memo(function TopProductsChart({ params, limit = 10 }: TopProductsChartProps) {
  const queryArgs = useMemo(() => ({ ...params, limit }), [params, limit])
  const polling = useLivePolling()
  const { running: live } = useLiveStatus()
  const { data, currentData, isLoading, isFetching, isError, error, refetch } = useGetTopProductsQuery(queryArgs, polling)

  const bars = useMemo<ProductBar[]>(
    () =>
      (data ?? []).map((product, index) => ({
        rank: index + 1,
        name: product.name,
        quantity: product.quantity,
        revenue: product.revenue,
        color: product.categoryColor,
      })),
    [data],
  )

  // Bars take the category color by index (Recharts 3 replaced <Cell> with the `shape` prop).
  const renderBar = useCallback(
    (props: BarShapeProps) => <Rectangle {...props} fill={bars[props.index]?.color ?? palette.brand[500]} />,
    [bars],
  )

  const renderNameTick = useCallback(
    ({ y, payload }: YAxisTickContentProps) => {
      const bar = bars[payload.index]
      if (!bar) return null
      return (
        <text x={TICK_LEFT} y={Number(y)} dominantBaseline="central" fontSize={15}>
          <tspan fill={palette.espresso[400]} fontSize={13}>
            {bar.rank}
          </tspan>
          <tspan x={TICK_LEFT + 30} fill={palette.espresso[900]}>
            {bar.name}
          </tspan>
        </text>
      )
    },
    [bars],
  )

  // The track spans [0, max], so its right end is bar width × max / value.
  const maxQuantity = bars[0]?.quantity ?? 0
  const renderQuantity = useCallback(
    ({ viewBox, value }: LabelProps) => {
      const quantity = Number(value)
      if (!viewBox || !('width' in viewBox) || quantity <= 0) return null
      const trackEnd = viewBox.x + (viewBox.width * maxQuantity) / quantity
      return (
        <text
          x={trackEnd + VALUE_COLUMN_WIDTH}
          y={viewBox.y + viewBox.height / 2}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={15}
          fontWeight={700}
          fill={palette.espresso[900]}
        >
          {formatNumber(quantity)}
        </text>
      )
    },
    [maxQuantity],
  )

  const renderTooltip = useCallback((props: TooltipContentProps) => {
    const bar = getTooltipDatum<ProductBar>(props)
    if (!bar) return null
    return (
      <ChartTooltip
        title={bar.name}
        rows={[
          { label: 'Продано', value: `${formatNumber(bar.quantity)} шт.`, color: bar.color },
          { label: 'Выручка', value: formatMoney(bar.revenue) },
        ]}
      />
    )
  }, [])

  let body
  if (isLoading) {
    body = (
      <div aria-busy="true" aria-label="Загрузка топа позиций" className="space-y-4 py-1">
        {Array.from({ length: limit }, (_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 flex-1" style={{ maxWidth: `${90 - index * 7}%` }} />
          </div>
        ))}
      </div>
    )
  } else if (isError || !data) {
    body = <ErrorState error={error} onRetry={refetch} />
  } else if (bars.length === 0) {
    body = <EmptyState title="Продаж за период нет" />
  } else {
    body = (
      <div className={clsx('transition-opacity', isFetching && !currentData && 'opacity-60')}>
        <ResponsiveContainer width="100%" height={bars.length * ROW_HEIGHT}>
          <BarChart
            data={bars}
            layout="vertical"
            margin={{ top: 0, right: VALUE_COLUMN_WIDTH, bottom: 0, left: 0 }}
            barCategoryGap={13}
          >
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="name"
              width={NAME_AXIS_WIDTH}
              tick={renderNameTick}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: cursorFill, radius: 8 }} />
            {/* Recharts hides LabelList while bars animate: with Live refetching every
                5 seconds the quantities would blink, so bars change without animation. */}
            <Bar
              dataKey="quantity"
              radius={4}
              background={{ fill: palette.cream[200], radius: 4 }}
              shape={renderBar}
              isAnimationActive={!live}
            >
              <LabelList dataKey="quantity" content={renderQuantity} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader title={`Топ-${limit} позиций`} subtitle="Продано, шт. · цвет — категория" />
      {body}
    </Card>
  )
})
