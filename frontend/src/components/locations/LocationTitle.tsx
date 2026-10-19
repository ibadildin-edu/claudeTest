import { skipToken } from '@reduxjs/toolkit/query'
import type { Params } from 'react-router'
import { useGetLocationQuery } from '@/api/locationsApi'
import { Skeleton } from '@/components/ui/Skeleton'
import { parseId } from '@/lib/ids'

/** Title of `/locations/:locationId` in the layout header; shares the cache with LocationPage. */
export function LocationTitle({ params }: { params: Params }) {
  const locationId = parseId(params.locationId)
  const { data, isLoading } = useGetLocationQuery(locationId ?? skipToken)

  if (isLoading) return <Skeleton className="h-10 w-56" />
  return data ? data.name : 'Точка'
}
