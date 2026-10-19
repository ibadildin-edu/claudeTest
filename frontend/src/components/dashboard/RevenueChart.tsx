import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { useGetKpiQuery, useGetRevenueDailyQuery } from '@/api/analyticsApi'
import type { AnalyticsParams } from '@/api/types'
import { ChartSkeleton } from '@/components/charts/ChartSkeleton'
import { ChartTooltip, type ChartTooltipRow } from '@/components/charts/ChartTooltip'
import { axisTick, getTooltipDatum, gridStroke } from '@/components/charts/chartTheme'
import { Card } from '@/components/ui/Card'
import { CardHeader } from '@/components/ui/CardHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { daysInRange } from '@/lib/dates'
import {
  formatCompact,
  formatDayFull,
  formatDayMonth,
  formatDelta,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
} from '@/lib/format'
import { palette } from '@/theme/palette'
import { RevenueLegend } from './RevenueLegend'

interface RevenueChartProps {
  params: AnalyticsParams
}

interface RevenuePoint {
  date: string
  revenue: number
  /** `null` when the previous period has no data at all: the dashed line is hidden then. */
  previous: number | null
  orders: number
}

const CHART_HEIGHT = 300

export const RevenueChart = memo(function RevenueChart({ params }: RevenueChartProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetRevenueDailyQuery(params)
  // Same args as KpiCards, so RTK Query serves it from the cache without a second request.
  const { data: kpi } = useGetKpiQuery(params)
  const days = daysInRange(params.dateFrom, params.dateTo)

  const { points, hasPrevious, isEmpty } = useMemo(() => {
    const rows = data ?? []
    const withPrevious = rows.some((point) => point.previousRevenue > 0)
    return {
      points: rows.map<RevenuePoint>((point) => ({
        date: point.date,
        revenue: point.revenue,
        previous: withPrevious ? point.previousRevenue : null,
        orders: point.ordersCount,
      })),
      hasPrevious: withPrevious,
      isEmpty: rows.every((point) => point.revenue === 0),
    }
  }, [data])

  const renderTooltip = useCallback(
    (props: TooltipContentProps) => {
      const point = getTooltipDatum<RevenuePoint>(props)
      if (!point) return null
      const rows: ChartTooltipRow[] = [{ label: 'Выручка', value: formatMoney(point.revenue), color: palette.brand[500] }]
      if (hasPrevious && point.previous !== null) {
        rows.push({ label: 'Прошлый период', value: formatMoney(point.previous), color: palette.espresso[300] })
      }
      rows.push({ label: 'Заказов', value: formatNumber(point.orders) })
      return <ChartTooltip title={formatDayFull(point.date)} rows={rows} />
    },
    [hasPrevious],
  )

  const revenueDelta = kpi?.revenue.deltaPct ?? null
  const subtitle = kpi ? (
    <>
      Всего {formatMoneyCompact(kpi.revenue.value)}
      {revenueDelta !== null && ` · ${formatDelta(revenueDelta)} к предыдущим ${days} дням`}
    </>
  ) : (
    <Skeleton className="mt-1 h-4 w-56" />
  )

  let body
  if (isLoading) {
    body = <ChartSkeleton className="h-[300px]" />
  } else if (isError || !data) {
    body = <ErrorState error={error} onRetry={refetch} />
  } else if (isEmpty) {
    body = <EmptyState title="Нет выручки за период" description="Выберите другой период или точку." />
  } else {
    body = (
      <div className={clsx('transition-opacity', isFetching && 'opacity-60')}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={gridStroke} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayMonth}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
              tickMargin={10}
            />
            <YAxis
              tickFormatter={formatCompact}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip content={renderTooltip} cursor={{ stroke: palette.cream[400] }} />
            <Area
              type="linear"
              dataKey="revenue"
              stroke={palette.brand[500]}
              strokeWidth={2.5}
              fill={palette.brand[100]}
              fillOpacity={0.6}
              activeDot={{ r: 4, strokeWidth: 0, fill: palette.brand[500] }}
            />
            {hasPrevious && (
              <Line
                type="linear"
                dataKey="previous"
                stroke={palette.espresso[300]}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader title="Выручка по дням" subtitle={subtitle} actions={<RevenueLegend withPrevious={hasPrevious} />} />
      {body}
    </Card>
  )
})
