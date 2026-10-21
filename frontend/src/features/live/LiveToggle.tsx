import clsx from 'clsx'
import { useCallback } from 'react'
import { getErrorMessage } from '@/api/errors'
import { useSetSimulatorRunningMutation } from '@/api/simulatorApi'
import { Toggle } from '@/components/ui/Toggle'
import { useLiveStatus } from './useLive'

/** Header switch: starts and stops the order simulator on the server. */
export function LiveToggle() {
  const { running, isLoading, isError } = useLiveStatus()
  const [setRunning, mutation] = useSetSimulatorRunningMutation()

  // While the request is in flight, show the state the user asked for.
  const checked = mutation.isLoading ? Boolean(mutation.originalArgs) : running

  const handleChange = useCallback(
    (next: boolean) => {
      if (!mutation.isLoading) void setRunning(next)
    },
    [mutation.isLoading, setRunning],
  )

  let title: string
  if (isError) {
    title = 'Симулятор недоступен: нет связи с API'
  } else if (mutation.isError) {
    const action = mutation.originalArgs ? 'запустить' : 'остановить'
    title = `Не удалось ${action} симулятор. ${getErrorMessage(mutation.error)}`
  } else if (running) {
    title = 'Новый заказ каждые 2–3 секунды, данные обновляются каждые 5 секунд'
  } else {
    title = 'Запустить симулятор заказов'
  }

  return (
    <Toggle checked={checked} onChange={handleChange} disabled={isLoading || isError} title={title}>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={clsx(
            'size-2.5 rounded-full',
            mutation.isError ? 'bg-danger-600' : checked ? 'animate-pulse bg-brand-500' : 'bg-cream-400',
          )}
        />
        Live
      </span>
    </Toggle>
  )
}
