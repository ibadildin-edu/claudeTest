import clsx from 'clsx'
import { Skeleton } from '@/components/ui/Skeleton'

/** Placeholder of the same height as the chart, so the page does not jump when data arrives. */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div aria-busy="true" aria-label="Загрузка графика" className={clsx('flex items-end gap-2', className)}>
      {[38, 62, 48, 80, 55, 70, 44, 90, 60, 75, 52, 66].map((height, index) => (
        <Skeleton key={index} className="flex-1 rounded-md" style={{ height: `${height}%` }} />
      ))}
    </div>
  )
}
