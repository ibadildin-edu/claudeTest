import { useAppSelector } from '@/app/hooks'
import { CategoryDonut } from '@/components/dashboard/CategoryDonut'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { LoadHeatmap } from '@/components/dashboard/LoadHeatmap'
import { LocationsCompareChart } from '@/components/dashboard/LocationsCompareChart'
import { RecentOrdersPanel } from '@/components/dashboard/RecentOrdersPanel'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { TopProductsChart } from '@/components/dashboard/TopProductsChart'
import { selectAnalyticsParams, selectLive, selectLocationId } from '@/features/filters/filtersSlice'

export function DashboardPage() {
  // Memoized selector: the same object until a filter changes, so memo() charts skip re-renders.
  const params = useAppSelector(selectAnalyticsParams)
  const locationId = useAppSelector(selectLocationId)
  const live = useAppSelector(selectLive)

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="@container flex min-w-0 flex-col gap-6">
        <KpiCards params={params} />
        <RevenueChart params={params} />
        <div className="grid gap-6 @4xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <TopProductsChart params={params} />
          <CategoryDonut params={params} />
        </div>
        <LoadHeatmap params={params} />
        <LocationsCompareChart params={params} highlightLocationId={locationId} />
      </div>
      <aside aria-label="Последние заказы" className="min-w-0">
        <RecentOrdersPanel locationId={locationId} live={live} />
      </aside>
    </div>
  )
}
