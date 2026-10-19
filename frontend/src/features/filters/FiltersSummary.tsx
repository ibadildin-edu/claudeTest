import { useGetLocationsQuery } from '@/api/locationsApi'
import { useAppSelector } from '@/app/hooks'
import { formatDateRange } from '@/lib/format'
import { selectDateRange, selectLocationId } from './filtersSlice'

interface FiltersSummaryProps {
  /** Mention the selected location (the dashboard) or show only the dates. */
  withLocation: boolean
}

/** «16 июл — 13 окт 2026 · точка «Набережная»» under the page title. */
export function FiltersSummary({ withLocation }: FiltersSummaryProps) {
  const { dateFrom, dateTo } = useAppSelector(selectDateRange)
  const locationId = useAppSelector(selectLocationId)
  const { data: locations } = useGetLocationsQuery(undefined, { skip: !withLocation })

  const dates = formatDateRange(dateFrom, dateTo)
  if (!withLocation) return dates

  const location = locations?.find(({ id }) => id === locationId)
  const scope = locationId === null ? 'вся сеть' : location ? `точка «${location.name}»` : 'точка'
  return `${dates} · ${scope}`
}
