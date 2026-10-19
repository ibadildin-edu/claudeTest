import clsx from 'clsx'
import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { Toggle } from '@/components/ui/Toggle'
import { liveChanged, selectLive } from './filtersSlice'

export function LiveToggle() {
  const live = useAppSelector(selectLive)
  const dispatch = useAppDispatch()

  const handleChange = useCallback((checked: boolean) => dispatch(liveChanged(checked)), [dispatch])

  return (
    <Toggle checked={live} onChange={handleChange}>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={clsx('size-2.5 rounded-full', live ? 'animate-pulse bg-brand-500' : 'bg-cream-400')}
        />
        Live
      </span>
    </Toggle>
  )
}
