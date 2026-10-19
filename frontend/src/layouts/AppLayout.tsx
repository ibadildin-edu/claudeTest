import { Outlet, ScrollRestoration } from 'react-router'
import { PageHeader } from './PageHeader'
import { Sidebar } from './Sidebar'

/** Root layout: sidebar, header with global filters, and the nested route in <Outlet/>. */
export function AppLayout() {
  return (
    <div className="min-h-dvh lg:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col px-4 pb-12 sm:px-6 lg:px-10">
        <PageHeader />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
    </div>
  )
}
