import { skipToken } from '@reduxjs/toolkit/query'
import { SearchX } from 'lucide-react'
import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useGetCategoriesQuery } from '@/api/categoriesApi'
import { isNotFoundError } from '@/api/errors'
import { useCreateProductMutation, useGetProductQuery, useUpdateProductMutation } from '@/api/productsApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { parseId } from '@/lib/ids'
import type { ProductFormValues } from '@/schemas/product'
import { ProductForm } from './ProductForm'

/** Nested routes `/menu/new` and `/menu/:productId/edit`: the menu table stays underneath. */
export function ProductFormModal() {
  const { productId: rawId } = useParams()
  const isEdit = rawId !== undefined
  const productId = parseId(rawId)
  const navigate = useNavigate()

  const product = useGetProductQuery(productId ?? skipToken)
  const categories = useGetCategoriesQuery()
  const [createProduct] = useCreateProductMutation()
  const [updateProduct] = useUpdateProductMutation()

  const handleClose = useCallback(() => navigate('/menu', { preventScrollReset: true }), [navigate])

  const handleSubmit = useCallback(
    async (values: ProductFormValues) => {
      if (productId === null) await createProduct(values).unwrap()
      else await updateProduct({ id: productId, patch: values }).unwrap()
      handleClose()
    },
    [productId, createProduct, updateProduct, handleClose],
  )

  let body
  if (isEdit && (productId === null || isNotFoundError(product.error))) {
    body = <EmptyState icon={SearchX} title="Позиция не найдена" description="Возможно, ссылка устарела." />
  } else if (categories.isLoading || (isEdit && product.isLoading)) {
    body = (
      <div aria-busy="true" aria-label="Загрузка формы" className="space-y-5">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-6 w-48" />
      </div>
    )
  } else if (categories.isError || (isEdit && product.isError)) {
    const error = categories.error ?? product.error
    body = <ErrorState error={error} onRetry={categories.isError ? categories.refetch : product.refetch} />
  } else {
    const current = product.data
    body = (
      <ProductForm
        // A fresh form per product: defaultValues are read only on mount.
        key={current?.id ?? 'new'}
        categories={categories.data ?? []}
        defaultValues={
          current
            ? { name: current.name, categoryId: current.categoryId, price: current.price, isActive: current.isActive }
            : undefined
        }
        submitLabel={isEdit ? 'Сохранить' : 'Добавить'}
        onSubmit={handleSubmit}
        onCancel={handleClose}
      />
    )
  }

  return (
    <Modal
      title={isEdit ? 'Редактирование позиции' : 'Новая позиция'}
      description={isEdit ? undefined : 'Позиция сразу появится в меню и в фильтрах заказов.'}
      onClose={handleClose}
    >
      {body}
    </Modal>
  )
}
