import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useGetKpiQuery } from '@/api/analyticsApi'
import type { AnalyticsParams, Kpi, Metric } from '@/api/types'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { daysInRange } from '@/lib/dates'
import { formatMoney, formatMoneyCompact, formatNumber, formatPct } from '@/lib/format'
import { KpiCard } from './KpiCard'
import { KpiCardSkeleton } from './KpiCardSkeleton'

interface KpiCardsProps {
  params: AnalyticsParams
}

interface KpiView {
  key: string
  label: string
  value: string
  delta: number | null
  footnote: string
  textValue?: boolean
}

function previousNote(days: number, metric: Metric, format: (value: number) => string): string {
  const prefix = `пред. ${days} дн.:`
  if (metric.previous === 0 && metric.deltaPct === null) return `${prefix} нет данных`
  return `${prefix} ${format(metric.previous)}`
}

function toViews(kpi: Kpi, days: number): KpiView[] {
  const { bestProduct } = kpi
  return [
    {
      key: 'revenue',
      label: 'Выручка',
      value: formatMoneyCompact(kpi.revenue.value),
      delta: kpi.revenue.deltaPct,
      footnote: previousNote(days, kpi.revenue, formatMoneyCompact),
    },
    {
      key: 'orders',
      label: 'Заказы',
      value: formatNumber(kpi.ordersCount.value),
      delta: kpi.ordersCount.deltaPct,
      footnote: previousNote(days, kpi.ordersCount, formatNumber),
    },
    {
      key: 'avgCheck',
      label: 'Средний чек',
      value: formatMoney(kpi.avgCheck.value),
      delta: kpi.avgCheck.deltaPct,
      footnote: previousNote(days, kpi.avgCheck, formatMoney),
    },
    {
      key: 'bestProduct',
      label: 'Лучшая позиция',
      value: bestProduct?.name ?? '—',
      delta: bestProduct?.deltaPct ?? null,
      footnote: bestProduct
        ? `${formatNumber(bestProduct.quantity)} шт. · ${formatPct(bestProduct.orderSharePct)} заказов`
        : 'Нет продаж за период',
      textValue: true,
    },
  ]
}

const GRID = 'grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-4'

export const KpiCards = memo(function KpiCards({ params }: KpiCardsProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetKpiQuery(params)
  const days = daysInRange(params.dateFrom, params.dateTo)

  const views = useMemo(() => (data ? toViews(data, days) : []), [data, days])

  if (isLoading) {
    return (
      <div className={GRID} aria-busy="true" aria-label="Загрузка показателей">
        {[0, 1, 2, 3].map((key) => (
          <KpiCardSkeleton key={key} />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card>
        <ErrorState title="Не удалось загрузить показатели" error={error} onRetry={refetch} />
      </Card>
    )
  }

  return (
    <div className={clsx(GRID, 'transition-opacity', isFetching && 'opacity-60')}>
      {views.map(({ key, ...view }) => (
        <KpiCard key={key} {...view} />
      ))}
    </div>
  )
})
