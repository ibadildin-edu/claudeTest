import { useCallback, useState } from 'react'
import { getErrorMessage } from '@/api/errors'
import { useDeleteProductMutation } from '@/api/productsApi'
import type { Product } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface HideProductDialogProps {
  product: Product
  onClose: () => void
}

/** DELETE /products/{id} is a soft delete: the product leaves the menu, its orders stay. */
export function HideProductDialog({ product, onClose }: HideProductDialogProps) {
  const [deleteProduct, { isLoading }] = useDeleteProductMutation()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = useCallback(async () => {
    try {
      await deleteProduct(product.id).unwrap()
      onClose()
    } catch (reason) {
      setError(getErrorMessage(reason))
    }
  }, [deleteProduct, product.id, onClose])

  return (
    <Modal title={`Скрыть «${product.name}»?`} onClose={onClose}>
      <p className="text-sm text-espresso-500">
        Позиция пропадёт из меню и из новых заказов. История продаж и аналитика за прошлые периоды не изменятся, а
        вернуть позицию можно в любой момент.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger-600">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="danger" disabled={isLoading} onClick={handleConfirm}>
          {isLoading ? 'Скрываем…' : 'Скрыть'}
        </Button>
      </div>
    </Modal>
  )
}
