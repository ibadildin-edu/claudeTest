import { RotateCcw } from 'lucide-react'
import { useCallback, useMemo, type ChangeEvent } from 'react'
import { useGetCategoriesQuery } from '@/api/categoriesApi'
import { useGetLocationsQuery } from '@/api/locationsApi'
import { useGetProductsQuery } from '@/api/productsApi'
import type { OrderStatus } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { hasActiveFilters, type OrdersSearch } from '@/schemas/ordersSearch'
import { AmountInput } from './AmountInput'
import { ORDER_STATUS_VIEW, ORDER_STATUSES } from './orderStatus'

interface OrdersFiltersProps {
  search: OrdersSearch
  onChange: (patch: Partial<OrdersSearch>) => void
  onReset: () => void
}

const ALL = ''

function toOptionalNumber(value: string): number | undefined {
  return value === ALL ? undefined : Number(value)
}

export function OrdersFilters({ search, onChange, onReset }: OrdersFiltersProps) {
  const { data: locations = [] } = useGetLocationsQuery()
  const { data: categories = [] } = useGetCategoriesQuery()
  const { data: products = [] } = useGetProductsQuery({ includeInactive: true })

  // Products of the chosen category only, so the two filters never contradict each other.
  const productOptions = useMemo(
    () => (search.categoryId ? products.filter((product) => product.categoryId === search.categoryId) : products),
    [products, search.categoryId],
  )

  const handleLocation = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => onChange({ locationId: toOptionalNumber(event.target.value) }),
    [onChange],
  )
  const handleStatus = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target
      onChange({ status: value === ALL ? undefined : (value as OrderStatus) })
    },
    [onChange],
  )
  const handleCategory = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) =>
      onChange({ categoryId: toOptionalNumber(event.target.value), productId: undefined }),
    [onChange],
  )
  const handleProduct = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => onChange({ productId: toOptionalNumber(event.target.value) }),
    [onChange],
  )
  const handleDateFrom = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange({ dateFrom: event.target.value || undefined }),
    [onChange],
  )
  const handleDateTo = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange({ dateTo: event.target.value || undefined }),
    [onChange],
  )
  const handleMinTotal = useCallback((value: number | undefined) => onChange({ minTotal: value }), [onChange])
  const handleMaxTotal = useCallback((value: number | undefined) => onChange({ maxTotal: value }), [onChange])

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Select aria-label="Точка" prefix="Точка" value={search.locationId ?? ALL} onChange={handleLocation}>
        <option value={ALL}>Все</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </Select>

      <Select aria-label="Статус" prefix="Статус" value={search.status ?? ALL} onChange={handleStatus}>
        <option value={ALL}>Любой</option>
        {ORDER_STATUSES.map((status) => (
          <option key={status} value={status}>
            {ORDER_STATUS_VIEW[status].label}
          </option>
        ))}
      </Select>

      <Select aria-label="Категория" prefix="Категория" value={search.categoryId ?? ALL} onChange={handleCategory}>
        <option value={ALL}>Все</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>

      <Select aria-label="Позиция" prefix="Позиция" value={search.productId ?? ALL} onChange={handleProduct}>
        <option value={ALL}>Все</option>
        {productOptions.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
            {product.isActive ? '' : ' (скрыта)'}
          </option>
        ))}
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="Дата с"
          leading="с"
          className="flex-1"
          value={search.dateFrom ?? ''}
          max={search.dateTo}
          onChange={handleDateFrom}
        />
        <Input
          type="date"
          aria-label="Дата по"
          leading="по"
          className="flex-1"
          value={search.dateTo ?? ''}
          min={search.dateFrom}
          onChange={handleDateTo}
        />
      </div>

      <div className="flex items-center gap-2">
        <AmountInput label="Сумма от" leading="от" value={search.minTotal} onCommit={handleMinTotal} />
        <AmountInput label="Сумма до" leading="до" value={search.maxTotal} onCommit={handleMaxTotal} />
      </div>

      {hasActiveFilters(search) && (
        <Button variant="ghost" className="justify-self-start" onClick={onReset}>
          <RotateCcw aria-hidden className="size-4" />
          Сбросить фильтры
        </Button>
      )}
    </div>
  )
}
