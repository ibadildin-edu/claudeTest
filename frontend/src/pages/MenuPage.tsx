import clsx from 'clsx'
import { Plus, Search, SearchX } from 'lucide-react'
import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { Link, Outlet } from 'react-router'
import { useGetCategoriesQuery } from '@/api/categoriesApi'
import { getErrorMessage } from '@/api/errors'
import { useGetProductsQuery, useUpdateProductMutation } from '@/api/productsApi'
import type { Product } from '@/api/types'
import { HideProductDialog } from '@/components/menu/HideProductDialog'
import { ProductsTable } from '@/components/menu/ProductsTable'
import { buttonClassName } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toggle } from '@/components/ui/Toggle'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

const ALL = ''

export function MenuPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [productToHide, setProductToHide] = useState<Product | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  const debouncedSearch = useDebouncedValue(search.trim(), 300)
  const productsArgs = useMemo(
    () => ({ search: debouncedSearch || undefined, categoryId, includeInactive }),
    [debouncedSearch, categoryId, includeInactive],
  )
  const products = useGetProductsQuery(productsArgs)
  const categories = useGetCategoriesQuery()
  const [updateProduct, { isLoading: isRestoring, originalArgs: restoreArgs }] = useUpdateProductMutation()

  const handleSearch = useCallback((event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value), [])
  const handleCategory = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target
    setCategoryId(value === ALL ? undefined : Number(value))
  }, [])
  const handleHide = useCallback((product: Product) => setProductToHide(product), [])
  const handleCloseHide = useCallback(() => setProductToHide(null), [])
  const handleRestore = useCallback(
    async (product: Product) => {
      setRestoreError(null)
      try {
        await updateProduct({ id: product.id, patch: { isActive: true } }).unwrap()
      } catch (error) {
        setRestoreError(`Не удалось вернуть «${product.name}»: ${getErrorMessage(error)}`)
      }
    },
    [updateProduct],
  )

  let body
  if (products.isLoading || categories.isLoading) {
    body = (
      <div aria-busy="true" aria-label="Загрузка меню" className="space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-11" />
        ))}
      </div>
    )
  } else if (products.isError || categories.isError || !products.data) {
    body = (
      <ErrorState
        error={products.error ?? categories.error}
        onRetry={products.isError ? products.refetch : categories.refetch}
      />
    )
  } else if (products.data.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title={debouncedSearch || categoryId ? 'Ничего не нашлось' : 'В меню пока пусто'}
        description={debouncedSearch || categoryId ? 'Измените поиск или категорию.' : 'Добавьте первую позицию.'}
      />
    )
  } else {
    body = (
      <div className={clsx('transition-opacity', products.isFetching && 'opacity-60')}>
        <ProductsTable
          products={products.data}
          categories={categories.data ?? []}
          onHide={handleHide}
          onRestore={handleRestore}
          restoringId={isRestoring ? restoreArgs?.id : null}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Input
            type="search"
            aria-label="Поиск по названию"
            placeholder="Поиск по названию"
            leading={<Search aria-hidden className="size-4" />}
            className="w-full sm:w-72"
            value={search}
            onChange={handleSearch}
          />
          <Select aria-label="Категория" prefix="Категория" value={categoryId ?? ALL} onChange={handleCategory}>
            <option value={ALL}>Все</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Toggle checked={includeInactive} onChange={setIncludeInactive}>
            Скрытые позиции
          </Toggle>
          <Link to="new" preventScrollReset className={buttonClassName('primary', 'md', 'sm:ml-auto')}>
            <Plus aria-hidden className="size-4" />
            Новая позиция
          </Link>
        </div>

        {restoreError && (
          <p role="alert" className="mb-4 rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger-600">
            {restoreError}
          </p>
        )}

        {body}
      </Card>

      {productToHide && <HideProductDialog product={productToHide} onClose={handleCloseHide} />}

      {/* /menu/new and /menu/:productId/edit — the product form modal */}
      <Outlet />
    </div>
  )
}
