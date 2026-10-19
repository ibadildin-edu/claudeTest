import { Card } from '@/components/ui/Card'
import { DeltaBadge } from '@/components/ui/DeltaBadge'

interface KpiCardProps {
  label: string
  value: string
  delta: number | null
  footnote: string
  /** Text values (a product name) get a smaller font than numbers. */
  textValue?: boolean
}

export function KpiCard({ label, value, delta, footnote, textValue = false }: KpiCardProps) {
  // The card is a size container: the value font scales with the card width (cqi), so «52,6 млн ₸» fits.
  return (
    <Card className="@container flex min-w-0 flex-col gap-3 p-5 sm:p-6">
      <div className="flex min-h-7 items-start justify-between gap-2">
        <h3 className="text-[15px] leading-tight text-espresso-500">{label}</h3>
        <DeltaBadge value={delta} />
      </div>
      <p
        className={
          textValue
            ? 'truncate text-[clamp(1.25rem,12cqi,1.75rem)] leading-tight font-extrabold tracking-tight'
            : 'truncate text-[clamp(1.375rem,14cqi,2rem)] leading-tight font-extrabold tracking-tight tabular-nums'
        }
        title={value}
      >
        {value}
      </p>
      <p className="text-sm text-espresso-400">{footnote}</p>
    </Card>
  )
}
