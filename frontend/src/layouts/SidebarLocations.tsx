import { Link } from 'react-router'
import { useGetLocationsQuery } from '@/api/locationsApi'
import { Skeleton } from '@/components/ui/Skeleton'
import { isOpenAt } from '@/lib/dates'
import { formatClock } from '@/lib/format'

/** «Точки сети» at the bottom of the sidebar: each location and its hours today. */
export function SidebarLocations() {
  const { data: locations, isLoading, isError } = useGetLocationsQuery()

  return (
    <div className="mt-auto hidden rounded-2xl bg-espresso-800 p-4 lg:block">
      <p className="mb-3 text-xs font-semibold text-espresso-300">Точки сети</p>
      {isLoading && (
        <div className="space-y-2.5">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-4 bg-espresso-700" />
          ))}
        </div>
      )}
      {isError && <p className="text-sm text-espresso-300">Не удалось загрузить</p>}
      {locations && (
        <ul className="space-y-1.5 text-sm">
          {locations.map((location) => {
            const open = isOpenAt(location.opensAt, location.closesAt)
            return (
              <li key={location.id}>
                <Link
                  to={`/locations/${location.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg py-0.5 font-semibold text-cream-100 hover:text-brand-300"
                >
                  {location.name}
                  <span className="font-medium text-espresso-300">
                    {open ? `до ${formatClock(location.closesAt)}` : `с ${formatClock(location.opensAt)}`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
