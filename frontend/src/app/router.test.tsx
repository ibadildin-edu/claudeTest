import { render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import type { Location, Order, OrdersPage } from '@/api/types'
import { mockApi } from '@/test/mockApi'
import { routes } from './router'
import { makeStore } from './store'

const locations: Location[] = [
  {
    id: 1,
    name: 'Центр',
    slug: 'center',
    address: 'пр. Абылай хана, 45',
    opensAt: '07:00:00',
    closesAt: '22:00:00',
    createdAt: '2026-10-14T08:25:00Z',
  },
]

const order: Order = {
  id: 42,
  locationId: 1,
  locationName: 'Центр',
  createdAt: '2026-10-14T07:59:30Z',
  status: 'completed',
  totalAmount: 3200,
  itemsCount: 2,
  items: [
    { id: 1, productId: 3, productName: 'Капучино', categoryId: 1, quantity: 2, unitPrice: 1600, lineTotal: 3200 },
  ],
}

const ordersPage: OrdersPage = {
  items: [{ ...order, itemsSummary: 'Капучино ×2' }],
  total: 1,
  page: 1,
  pageSize: 20,
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Provider store={makeStore()}>
      <RouterProvider router={router} />
    </Provider>,
  )
  return router
}

describe('routes', () => {
  it('renders 404 inside the layout for an unknown path', async () => {
    mockApi({ '/locations': locations, '/categories': [], '/products': [] })
    renderAt('/no-such-page')

    expect(await screen.findByText('404')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Страница не найдена' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Разделы' })).toBeInTheDocument()
  })

  it('opens the order drawer as a nested route over the orders table', async () => {
    mockApi({
      '/locations': locations,
      '/categories': [],
      '/products': [],
      '/orders': ordersPage,
      '/orders/42': order,
    })
    renderAt('/orders/42?status=completed')

    const drawer = await screen.findByRole('dialog', { name: 'Заказ #42' })
    expect(await within(drawer).findByText('Капучино')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Заказы' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '#42' })).toHaveAttribute('href', '/orders/42?status=completed')
  })

  it('shows «not found» for a location id that does not exist', async () => {
    mockApi({ '/locations': locations })
    renderAt('/locations/999')

    expect(await screen.findByText('Точка не найдена')).toBeInTheDocument()
  })
})
