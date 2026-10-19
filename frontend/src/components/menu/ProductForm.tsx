import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { getErrorMessage, getErrorStatus, getFieldErrors } from '@/api/errors'
import type { Category } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { productSchema, type ProductFormValues } from '@/schemas/product'

interface ProductFormProps {
  categories: readonly Category[]
  defaultValues?: Partial<ProductFormValues>
  submitLabel: string
  /** Should throw (e.g. `.unwrap()` of an RTK Query mutation) so server errors land in the form. */
  onSubmit: (values: ProductFormValues) => Promise<void>
  onCancel: () => void
}

const FIELDS = ['name', 'categoryId', 'price', 'isActive'] as const satisfies readonly (keyof ProductFormValues)[]

function isFormField(field: string): field is (typeof FIELDS)[number] {
  return (FIELDS as readonly string[]).includes(field)
}

export function ProductForm({ categories, defaultValues, submitLabel, onSubmit, onCancel }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: '', isActive: true, ...defaultValues },
  })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      if (getErrorStatus(error) === 409) {
        setError('name', { message: 'Позиция с таким названием уже есть' }, { shouldFocus: true })
        return
      }
      const fieldErrors = Object.entries(getFieldErrors(error)).filter(([field]) => isFormField(field))
      if (fieldErrors.length > 0) {
        for (const [field, message] of fieldErrors) if (isFormField(field)) setError(field, { message })
        return
      }
      setError('root.server', { message: getErrorMessage(error) })
    }
  })

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <Field label="Название" htmlFor="product-name" error={errors.name?.message}>
        <Input
          id="product-name"
          autoComplete="off"
          placeholder="Например, Флэт уайт"
          invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'product-name-message' : undefined}
          {...register('name')}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Категория" htmlFor="product-category" error={errors.categoryId?.message}>
          <Select
            id="product-category"
            invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? 'product-category-message' : undefined}
            {...register('categoryId', { valueAsNumber: true })}
          >
            <option value="">Выберите…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Цена" htmlFor="product-price" error={errors.price?.message} hint="Целые тенге">
          <Input
            id="product-price"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="1500"
            trailing="₸"
            invalid={Boolean(errors.price)}
            aria-describedby="product-price-message"
            {...register('price', { valueAsNumber: true })}
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-brand-500" {...register('isActive')} />
        Показывать в меню
      </label>

      {errors.root?.server && (
        <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger-600">
          {errors.root.server.message}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Сохраняем…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
