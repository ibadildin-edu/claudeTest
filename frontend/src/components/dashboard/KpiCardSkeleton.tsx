import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

export function KpiCardSkeleton() {
  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-4 w-32" />
    </Card>
  )
}
