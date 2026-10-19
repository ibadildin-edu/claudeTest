import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useGetHeatmapQuery } from '@/api/analyticsApi'
import type { AnalyticsParams } from '@/api/types'
import { Card } from '@/components/ui/Card'
import { CardHeader } from '@/components/ui/CardHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { HeatmapGrid } from './HeatmapGrid'

interface LoadHeatmapProps {
  params: AnalyticsParams
}

export const LoadHeatmap = memo(function LoadHeatmap({ params }: LoadHeatmapProps) {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetHeatmapQuery(params)

  const subtitle = useMemo(() => {
    if (!data || data.length === 0) return 'Среднее число заказов в час'
    const hours = data.map((cell) => cell.hour)
    return `Среднее число заказов в час, ${Math.min(...hours)}:00–${Math.max(...hours) + 1}:00`
  }, [data])

  let body
  if (isLoading) {
    body = (
      <div aria-busy="true" aria-label="Загрузка тепловой карты" className="space-y-1.5">
        <Skeleton className="mb-4 h-8 w-72 rounded-full" />
        {[0, 1, 2, 3, 4, 5, 6].map((key) => (
          <Skeleton key={key} className="h-9" />
        ))}
      </div>
    )
  } else if (isError || !data) {
    body = <ErrorState error={error} onRetry={refetch} />
  } else if (data.every((cell) => cell.avgOrders === 0)) {
    body = <EmptyState title="Заказов за период нет" />
  } else {
    body = (
      <div className={clsx('transition-opacity', isFetching && 'opacity-60')}>
        <HeatmapGrid cells={data} />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader title="Загрузка по часам" subtitle={subtitle} />
      {body}
    </Card>
  )
})
