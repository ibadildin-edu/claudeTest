import { createBrowserRouter, type RouteObject } from 'react-router'
import { LocationTitle } from '@/components/locations/LocationTitle'
import { AppLayout } from '@/layouts/AppLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PageSkeleton } from '@/pages/PageSkeleton'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import type { RouteHandle } from './routeHandle'

// Pages are loaded on demand: Recharts is only downloaded for the pages with charts.
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        // Pathless route: a page that throws renders the error inside the layout, not instead of it.
        errorElement: <RouteErrorPage />,
        hydrateFallbackElement: <PageSkeleton />,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/pages/DashboardPage')).DashboardPage }),
            handle: { title: 'Дашборд', filters: ['period', 'location', 'live'] } satisfies RouteHandle,
          },
          {
            path: 'orders',
            lazy: async () => ({ Component: (await import('@/pages/OrdersPage')).OrdersPage }),
            handle: { title: 'Заказы', description: 'Все заказы сети: фильтры, сортировка, состав' } satisfies RouteHandle,
            children: [
              {
                path: ':orderId',
                lazy: async () => ({ Component: (await import('@/components/orders/OrderDrawer')).OrderDrawer }),
              },
            ],
          },
          {
            path: 'menu',
            lazy: async () => ({ Component: (await import('@/pages/MenuPage')).MenuPage }),
            handle: { title: 'Меню', description: 'Позиции, цены и категории' } satisfies RouteHandle,
            children: [
              {
                path: 'new',
                lazy: async () => ({ Component: (await import('@/components/menu/ProductFormModal')).ProductFormModal }),
              },
              {
                path: ':productId/edit',
                lazy: async () => ({ Component: (await import('@/components/menu/ProductFormModal')).ProductFormModal }),
              },
            ],
          },
          {
            path: 'locations',
            children: [
              {
                index: true,
                lazy: async () => ({ Component: (await import('@/pages/LocationsPage')).LocationsPage }),
                handle: { title: 'Точки', filters: ['period'] } satisfies RouteHandle,
              },
              {
                path: ':locationId',
                lazy: async () => ({ Component: (await import('@/pages/LocationPage')).LocationPage }),
                handle: { title: LocationTitle, filters: ['period'] } satisfies RouteHandle,
              },
            ],
          },
          {
            path: '*',
            element: <NotFoundPage />,
            handle: { title: 'Страница не найдена' } satisfies RouteHandle,
          },
        ],
      },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
