import { useMatches } from 'react-router'
import { isRouteHandle } from '@/app/routeHandle'
import { FiltersSummary } from '@/features/filters/FiltersSummary'
import { LocationFilter } from '@/features/filters/LocationFilter'
import { PeriodFilter } from '@/features/filters/PeriodFilter'
import { LiveToggle } from '@/features/live/LiveToggle'

/** Title and global filters of the current page, taken from the deepest route `handle`. */
export function PageHeader() {
  const matches = useMatches()
  const match = matches.findLast((item) => isRouteHandle(item.handle))
  if (!match || !isRouteHandle(match.handle)) return null

  const { title: Title, description, filters = [] } = match.handle
  const hasPeriod = filters.includes('period')

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-6 pb-6 lg:pt-9 lg:pb-8">
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-[34px]">
          {typeof Title === 'string' ? Title : <Title params={match.params} />}
        </h1>
        <p className="mt-1 text-[15px] text-espresso-400">
          {hasPeriod ? <FiltersSummary withLocation={filters.includes('location')} /> : description}
        </p>
      </div>
      {filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {hasPeriod && <PeriodFilter />}
          {filters.includes('location') && <LocationFilter />}
          {filters.includes('live') && <LiveToggle />}
        </div>
      )}
    </header>
  )
}
