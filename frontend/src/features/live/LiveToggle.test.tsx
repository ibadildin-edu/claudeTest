import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { describe, expect, it } from 'vitest'
import type { SimulatorStatus } from '@/api/types'
import { makeStore } from '@/app/store'
import { mockApi } from '@/test/mockApi'
import { LiveToggle } from './LiveToggle'

const stopped: SimulatorStatus = {
  running: false,
  startedAt: null,
  ordersCreated: 0,
  lastOrderAt: null,
  idleReason: null,
}
const running: SimulatorStatus = { ...stopped, running: true, startedAt: '2026-10-19T08:30:00Z' }

function requestsTo(fetchMock: ReturnType<typeof mockApi>, path: string) {
  return fetchMock.mock.calls
    .map(([input]) => input)
    .filter((input): input is Request => input instanceof Request && input.url.endsWith(path))
}

describe('LiveToggle', () => {
  it('starts the simulator and switches on from the response', async () => {
    const fetchMock = mockApi({ '/simulator/status': stopped, '/simulator/start': running })
    render(
      <Provider store={makeStore()}>
        <LiveToggle />
      </Provider>,
    )

    const toggle = await screen.findByRole('switch', { name: 'Live' })
    await screen.findByTitle('Запустить симулятор заказов')
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(toggle)

    expect(await screen.findByTitle(/Новый заказ каждые 2–3 секунды/)).toHaveAttribute('aria-checked', 'true')
    const [start] = requestsTo(fetchMock, '/api/v1/simulator/start')
    expect(start.method).toBe('POST')
  })

  it('is disabled when the API is unreachable', async () => {
    mockApi({})
    render(
      <Provider store={makeStore()}>
        <LiveToggle />
      </Provider>,
    )

    expect(await screen.findByTitle(/Симулятор недоступен/)).toBeDisabled()
  })
})
