export function RevenueLegend({ withPrevious }: { withPrevious: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-espresso-500">
      <span className="flex items-center gap-2">
        <span aria-hidden className="h-[3px] w-5 rounded-full bg-brand-500" />
        Текущий период
      </span>
      {withPrevious && (
        <span className="flex items-center gap-2">
          <span aria-hidden className="w-5 border-t-2 border-dashed border-espresso-300" />
          Прошлый период
        </span>
      )}
    </div>
  )
}
