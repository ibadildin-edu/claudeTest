import { MapPin } from 'lucide-react'
import { useMemo } from 'react'
import { useGetLocationsCompareQuery } from '@/api/analyticsApi'
import { useGetLocationsQuery } from '@/api/locationsApi'
import { useAppSelector } from '@/app/hooks'
import { LocationsCompareChart } from '@/components/dashboard/LocationsCompareChart'
import { LocationCard } from '@/components/locations/LocationCard'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { selectDateRange } from '@/features/filters/filtersSlice'

export function LocationsPage() {
  const range = useAppSelector(selectDateRange)
  const locations = useGetLocationsQuery()
  // Same args as inside LocationsCompareChart, so both read one cache entry.
  const compare = useGetLocationsCompareQuery(range)

  const statsById = useMemo(() => new Map(compare.data?.map((item) => [item.locationId, item])), [compare.data])

  let cards
  if (locations.isLoading) {
    cards = [0, 1, 2].map((key) => (
      <Card key={key} className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-20" />
      </Card>
    ))
  } else if (locations.isError || !locations.data) {
    cards = (
      <Card className="col-span-full">
        <ErrorState error={locations.error} onRetry={locations.refetch} />
      </Card>
    )
  } else if (locations.data.length === 0) {
    cards = (
      <Card className="col-span-full">
        <EmptyState icon={MapPin} title="Точек пока нет" />
      </Card>
    )
  } else {
    cards = locations.data.map((location) => (
      <LocationCard key={location.id} location={location} stats={statsById.get(location.id)} />
    ))
  }

  return (
    <div className="@container space-y-6">
      <div className="grid gap-6 @3xl:grid-cols-2 @6xl:grid-cols-3">{cards}</div>
      <LocationsCompareChart params={range} />
    </div>
  )
}
