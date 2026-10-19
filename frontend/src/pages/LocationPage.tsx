import { skipToken } from '@reduxjs/toolkit/query'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router'
import { isNotFoundError } from '@/api/errors'
import { useGetLocationQuery } from '@/api/locationsApi'
import type { AnalyticsParams } from '@/api/types'
import { useAppSelector } from '@/app/hooks'
import { CategoryDonut } from '@/components/dashboard/CategoryDonut'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { LoadHeatmap } from '@/components/dashboard/LoadHeatmap'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { TopProductsChart } from '@/components/dashboard/TopProductsChart'
import { OpenStatus } from '@/components/locations/OpenStatus'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { selectDateRange } from '@/features/filters/filtersSlice'
import { parseId } from '@/lib/ids'
import { NotFoundPage } from './NotFoundPage'

/** `/locations/:locationId`: the dashboard filtered to one location. */
export function LocationPage() {
  const locationId = parseId(useParams().locationId)
  const range = useAppSelector(selectDateRange)
  const { data: location, isError, error, refetch } = useGetLocationQuery(locationId ?? skipToken)

  const params = useMemo<AnalyticsParams>(() => ({ ...range, locationId: locationId ?? undefined }), [range, locationId])

  if (locationId === null || isNotFoundError(error)) {
    return <NotFoundPage title="Точка не найдена" description="Такой точки нет в сети. Выберите точку из списка." />
  }
  if (isError) {
    return (
      <Card>
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    )
  }

  return (
    <div className="@container space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <Link to="/locations" className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700">
          <ArrowLeft aria-hidden className="size-4" />
          Все точки
        </Link>
        {location ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-espresso-500">
              <MapPin aria-hidden className="size-4" />
              {location.address}
            </span>
            <OpenStatus location={location} />
          </>
        ) : (
          <Skeleton className="h-5 w-72" />
        )}
      </div>

      <KpiCards params={params} />
      <RevenueChart params={params} />
      <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <TopProductsChart params={params} />
        <CategoryDonut params={params} />
      </div>
      <LoadHeatmap params={params} />
    </div>
  )
}
