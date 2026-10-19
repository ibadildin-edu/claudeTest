import clsx from 'clsx'
import { ClipboardList, Coffee, LayoutDashboard, MapPin, ReceiptText, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { SidebarLocations } from './SidebarLocations'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Дашборд', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Заказы', icon: ReceiptText },
  { to: '/menu', label: 'Меню', icon: ClipboardList },
  { to: '/locations', label: 'Точки', icon: MapPin },
]

export function Sidebar() {
  return (
    <aside className="bg-espresso-900 text-cream-200 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:p-4">
      <div className="flex items-center gap-4 overflow-x-auto px-4 py-3 lg:block lg:overflow-visible lg:p-0">
        <NavLink to="/" className="flex shrink-0 items-center gap-3 lg:px-2 lg:pt-3 lg:pb-8">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-500 text-cream-50">
            <Coffee aria-hidden className="size-5" />
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight text-cream-50 sm:inline">CoffeeMetrics</span>
        </NavLink>

        <nav aria-label="Разделы" className="flex gap-1 lg:flex-col">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold whitespace-nowrap transition-colors lg:px-4 lg:py-3',
                  isActive ? 'bg-espresso-700 text-cream-50' : 'text-cream-300/80 hover:bg-espresso-800 hover:text-cream-50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon aria-hidden className={clsx('size-5', isActive && 'text-brand-400')} />
                  <span className="max-sm:sr-only">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <SidebarLocations />
    </aside>
  )
}
