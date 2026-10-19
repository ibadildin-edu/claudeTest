import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl'
import { periodChanged, selectPeriod, type Period } from './filtersSlice'

const PERIOD_OPTIONS: readonly SegmentedOption<Period>[] = [
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: '90d', label: '90 дней' },
]

export function PeriodFilter() {
  const period = useAppSelector(selectPeriod)
  const dispatch = useAppDispatch()

  const handleChange = useCallback((value: Period) => dispatch(periodChanged(value)), [dispatch])

  return <SegmentedControl ariaLabel="Период" value={period} options={PERIOD_OPTIONS} onChange={handleChange} />
}
