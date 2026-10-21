import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { Link } from 'react-router'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from 'recharts'
import { useGetLocationsCompareQuery } from '@/api/analyticsApi'
import type { AnalyticsParams } from '@/api/types'
import { ChartSkeleton } from '@/components/charts/ChartSkeleton'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { axisTick, cursorFill, getTooltipDatum, gridStroke } from '@/components/charts/chartTheme'
import { Card } from '@/components/ui/Card'
import { CardHeader } from '@/components/ui/CardHeader'
import { DeltaBadge } from '@/components/ui/DeltaBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { useLivePolling } from '@/features/live/useLive'
import { formatCompact, formatMoney, formatMoneyCompact, formatNumber } from '@/lib/format'
import { palette } from '@/theme/palette'

interface LocationsCompareChartProps {
  params: AnalyticsParams
  /** The location picked in the header filter is highlighted, the others fade. */
  highlightLocationId?: number | null
}

interface LocationBar {
  id: number
  name: string
  revenue: number
  ordersCount: number
  avgCheck: number
  deltaPct: number | null
  dimmed: boolean
}

const CHART_HEIGHT = 260

export const LocationsCompareChart = memo(function LocationsCompareChart({
  params,
  highlightLocationId = null,
}: LocationsCompareChartProps) {
  // The endpoint ignores locationId: it always compares the whole network.
  const queryArgs = useMemo(() => ({ dateFrom: params.dateFrom, dateTo: params.dateTo }), [params.dateFrom, params.dateTo])
  const polling = useLivePolling()
  const { data, currentData, isLoading, isFetching, isError, error, refetch } = useGetLocationsCompareQuery(queryArgs, polling)

  const bars = useMemo<LocationBar[]>(
    () =>
      (data ?? []).map((item) => ({
        id: item.locationId,
        name: item.name,
        revenue: item.revenue,
        ordersCount: item.ordersCount,
        avgCheck: item.avgCheck,
        deltaPct: item.deltaPct,
        dimmed: highlightLocationId !== null && item.locationId !== highlightLocationId,
      })),
    [data, highlightLocationId],
  )

  const renderRevenueBar = useCallback(
    (props: BarShapeProps) => (
      <Rectangle {...props} fill={palette.brand[500]} fillOpacity={bars[props.index]?.dimmed ? 0.3 : 1} />
    ),
    [bars],
  )
  const renderOrdersBar = useCallback(
    (props: BarShapeProps) => (
      <Rectangle {...props} fill={palette.espresso[600]} fillOpacity={bars[props.index]?.dimmed ? 0.3 : 1} />
    ),
    [bars],
  )

  const renderTooltip = useCallback((props: TooltipContentProps) => {
    const bar = getTooltipDatum<LocationBar>(props)
    if (!bar) return null
    return (
      <ChartTooltip
        title={bar.name}
        rows={[
          { label: 'Выручка', value: formatMoney(bar.revenue), color: palette.brand[500] },
          { label: 'Заказы', value: formatNumber(bar.ordersCount), color: palette.espresso[600] },
          { label: 'Средний чек', value: formatMoney(bar.avgCheck) },
        ]}
      />
    )
  }, [])

  const legend = (
    <div className="flex items-center gap-5 text-sm text-espresso-500">
      <span className="flex items-center gap-2">
        <span aria-hidden className="size-3 rounded bg-brand-500" />
        Выручка
      </span>
      <span className="flex items-center gap-2">
        <span aria-hidden className="size-3 rounded bg-espresso-600" />
        Заказы
      </span>
    </div>
  )

  let body
  if (isLoading) {
    body = <ChartSkeleton className="h-[260px]" />
  } else if (isError || !data) {
    body = <ErrorState error={error} onRetry={refetch} />
  } else if (bars.length === 0) {
    body = <EmptyState title="Нет точек для сравнения" />
  } else {
    body = (
      <div className={clsx('transition-opacity', isFetching && !currentData && 'opacity-60')}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={bars} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barGap={6} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke={gridStroke} />
            <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis
              yAxisId="revenue"
              tickFormatter={formatCompact}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              tickFormatter={formatCompact}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: cursorFill }} />
            <Bar yAxisId="revenue" dataKey="revenue" name="Выручка" radius={[6, 6, 0, 0]} shape={renderRevenueBar} />
            <Bar yAxisId="orders" dataKey="ordersCount" name="Заказы" radius={[6, 6, 0, 0]} shape={renderOrdersBar} />
          </BarChart>
        </ResponsiveContainer>

        <ul className="mt-5 grid gap-3 @2xl:grid-cols-3">
          {bars.map((bar) => (
            <li key={bar.id}>
              <Link
                to={`/locations/${bar.id}`}
                className={clsx(
                  'block rounded-2xl border border-cream-300 px-4 py-3 transition-colors hover:border-brand-300 hover:bg-cream-100',
                  bar.dimmed && 'opacity-60',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold">{bar.name}</span>
                  <DeltaBadge value={bar.deltaPct} />
                </span>
                <span className="mt-1 block text-sm text-espresso-400">
                  {formatMoneyCompact(bar.revenue)} · чек {formatMoney(bar.avgCheck)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader title="Сравнение точек" subtitle="Выручка и заказы за период, изменение выручки" actions={legend} />
      {body}
    </Card>
  )
})
