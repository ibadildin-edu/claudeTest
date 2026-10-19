import clsx from 'clsx'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useMemo, type MouseEvent } from 'react'
import { Link } from 'react-router'
import type { Category, Product } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { buttonClassName } from '@/components/ui/buttonStyles'
import { ColorDot } from '@/components/ui/ColorDot'
import { Table } from '@/components/ui/Table'
import { tdClassName, thClassName } from '@/components/ui/tableStyles'
import { formatMoney } from '@/lib/format'

interface ProductsTableProps {
  products: readonly Product[]
  categories: readonly Category[]
  onHide: (product: Product) => void
  onRestore: (product: Product) => void
  /** Id of the product whose restore request is in flight. */
  restoringId?: number | null
}

export function ProductsTable({ products, categories, onHide, onRestore, restoringId = null }: ProductsTableProps) {
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  const findProduct = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => productById.get(Number(event.currentTarget.dataset.productId)),
    [productById],
  )
  const handleHide = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const product = findProduct(event)
      if (product) onHide(product)
    },
    [findProduct, onHide],
  )
  const handleRestore = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const product = findProduct(event)
      if (product) onRestore(product)
    },
    [findProduct, onRestore],
  )

  return (
    <Table>
      <thead>
        <tr>
          <th scope="col" className={thClassName}>
            Название
          </th>
          <th scope="col" className={thClassName}>
            Категория
          </th>
          <th scope="col" className={clsx(thClassName, 'text-right')}>
            Цена
          </th>
          <th scope="col" className={thClassName}>
            Статус
          </th>
          <th scope="col" className={clsx(thClassName, 'text-right')}>
            <span className="sr-only">Действия</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {
          const category = categoryById.get(product.categoryId)
          return (
            <tr key={product.id} className={clsx(!product.isActive && 'text-espresso-400')}>
              <td className={clsx(tdClassName, 'font-semibold')}>{product.name}</td>
              <td className={tdClassName}>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  {category && <ColorDot color={category.color} />}
                  {category?.name ?? '—'}
                </span>
              </td>
              <td className={clsx(tdClassName, 'text-right font-bold whitespace-nowrap tabular-nums')}>
                {formatMoney(product.price)}
              </td>
              <td className={tdClassName}>
                {product.isActive ? <Badge tone="success">В меню</Badge> : <Badge>Скрыта</Badge>}
              </td>
              <td className={clsx(tdClassName, 'text-right whitespace-nowrap')}>
                <span className="inline-flex gap-1">
                  <Link
                    to={`${product.id}/edit`}
                    preventScrollReset
                    className={buttonClassName('ghost', 'sm')}
                    aria-label={`Изменить «${product.name}»`}
                  >
                    <Pencil aria-hidden className="size-4" />
                    <span className="hidden sm:inline">Изменить</span>
                  </Link>
                  {product.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:text-danger-600"
                      aria-label={`Скрыть «${product.name}»`}
                      data-product-id={product.id}
                      onClick={handleHide}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Вернуть «${product.name}» в меню`}
                      disabled={restoringId === product.id}
                      data-product-id={product.id}
                      onClick={handleRestore}
                    >
                      <RotateCcw aria-hidden className="size-4" />
                    </Button>
                  )}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}
