import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps, type TooltipContentProps } from 'recharts'
import { useGetCategoryShareQuery } from '@/api/analyticsApi'
import type { AnalyticsParams } from '@/api/types'
import { ChartTooltip } from '@/components/charts/ChartTooltip'
import { getTooltipDatum } from '@/components/charts/chartTheme'
import { Card } from '@/components/ui/Card'
import { CardHeader } from '@/components/ui/CardHeader'
import { ColorDot } from '@/components/ui/ColorDot'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatMoney, formatMoneyCompact, formatPct, pluralize } from '@/lib/format'
import { palette } from '@/theme/palette'

interface CategoryDonutProps {
  params: AnalyticsParams
}

interface Slice {
  id: number
  name: string
  color: string
  revenue: number
  sharePct: number
}

const CATEGORY_FORMS = { one: 'категория', few: 'категории', many: 'категорий' }

export const CategoryDonut = memo(function CategoryDonut({ params }: CategoryDonutProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCategoryShareQuery(params)

  const slices = useMemo<Slice[]>(
    () =>
      (data?.items ?? [])
        .filter((item) => item.revenue > 0)
        .map((item) => ({
          id: item.categoryId,
          name: item.name,
          color: item.color,
          revenue: item.revenue,
          sharePct: item.sharePct,
        })),
    [data],
  )

  const renderSector = useCallback(
    (props: PieSectorShapeProps) => <Sector {...props} fill={slices[props.index]?.color ?? palette.brand[500]} />,
    [slices],
  )

  const renderTooltip = useCallback((props: TooltipContentProps) => {
    const slice = getTooltipDatum<Slice>(props)
    if (!slice) return null
    return (
      <ChartTooltip
        title={slice.name}
        rows={[
          { label: 'Выручка', value: formatMoney(slice.revenue), color: slice.color },
          { label: 'Доля', value: formatPct(slice.sharePct) },
        ]}
      />
    )
  }, [])

  let body
  if (isLoading) {
    body = (
      <div aria-busy="true" aria-label="Загрузка долей категорий" className="flex flex-col items-center gap-6">
        <Skeleton className="size-52 rounded-full" />
        <div className="w-full space-y-3">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-5" />
          ))}
        </div>
      </div>
    )
  } else if (isError || !data) {
    body = <ErrorState error={error} onRetry={refetch} />
  } else if (slices.length === 0) {
    body = <EmptyState title="Продаж за период нет" />
  } else {
    body = (
      <div className={clsx('transition-opacity', isFetching && 'opacity-60')}>
        <div className="relative mx-auto h-56 max-w-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="revenue"
                nameKey="name"
                innerRadius="70%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={1}
                stroke={palette.cream[50]}
                strokeWidth={2}
                shape={renderSector}
              />
              <Tooltip content={renderTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-sm text-espresso-400">Выручка</span>
            <span className="text-2xl font-extrabold tracking-tight">{formatMoneyCompact(data.totalRevenue)}</span>
            <span className="text-sm text-espresso-400">
              {slices.length} {pluralize(slices.length, CATEGORY_FORMS)}
            </span>
          </div>
        </div>

        <ul className="mt-7 space-y-3.5">
          {slices.map((slice) => (
            <li key={slice.id} className="grid grid-cols-[1fr_auto_3.5rem] items-center gap-3 text-[15px]">
              <span className="flex min-w-0 items-center gap-3">
                <ColorDot color={slice.color} className="size-3" />
                <span className="truncate">{slice.name}</span>
              </span>
              <span className="text-espresso-400 tabular-nums">{formatMoneyCompact(slice.revenue)}</span>
              <span className="text-right font-bold tabular-nums">{formatPct(Math.round(slice.sharePct))}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader title="Доли категорий" subtitle="По выручке за период" />
      {body}
    </Card>
  )
})
