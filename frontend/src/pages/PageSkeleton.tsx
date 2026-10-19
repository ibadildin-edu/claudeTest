import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

/** Shown inside the layout while the code of the first page is loading (lazy routes). */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка страницы" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <Card key={key} className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-36" />
          </Card>
        ))}
      </div>
      <Card>
        <Skeleton className="h-72" />
      </Card>
    </div>
  )
}
