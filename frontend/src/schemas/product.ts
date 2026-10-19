import { z } from 'zod'

/** Same limits as ProductCreate in openapi.json: name 1–100 chars, price is whole tenge in (0; 1 000 000]. */
export const MAX_PRICE = 1_000_000

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название').max(100, 'Не длиннее 100 символов'),
  categoryId: z
    .number({ error: 'Выберите категорию' })
    .int('Выберите категорию')
    .positive('Выберите категорию'),
  price: z
    .number({ error: 'Укажите цену' })
    .int('Цена — целое число тенге, без копеек')
    .positive('Цена должна быть больше нуля')
    .max(MAX_PRICE, 'Не больше 1 000 000 ₸'),
  isActive: z.boolean(),
})

export type ProductFormValues = z.infer<typeof productSchema>
