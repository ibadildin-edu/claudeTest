import { describe, expect, it } from 'vitest'
import { productSchema } from './product'

const valid = { name: 'Флэт уайт', categoryId: 1, price: 1700, isActive: true }

function messageFor(input: unknown, field: string): string | undefined {
  const result = productSchema.safeParse(input)
  return result.success ? undefined : result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe('productSchema', () => {
  it('accepts a valid product and trims the name', () => {
    expect(productSchema.parse({ ...valid, name: '  Флэт уайт  ' })).toEqual(valid)
  })

  it('requires a name', () => {
    expect(messageFor({ ...valid, name: '   ' }, 'name')).toBe('Укажите название')
    expect(messageFor({ ...valid, name: 'x'.repeat(101) }, 'name')).toBe('Не длиннее 100 символов')
  })

  it('requires a category (an empty <select> gives NaN)', () => {
    expect(messageFor({ ...valid, categoryId: Number.NaN }, 'categoryId')).toBe('Выберите категорию')
  })

  it('keeps prices in whole tenge within the API limits', () => {
    expect(messageFor({ ...valid, price: Number.NaN }, 'price')).toBe('Укажите цену')
    expect(messageFor({ ...valid, price: 0 }, 'price')).toBe('Цена должна быть больше нуля')
    expect(messageFor({ ...valid, price: 1500.5 }, 'price')).toBe('Цена — целое число тенге, без копеек')
    expect(messageFor({ ...valid, price: 1_000_001 }, 'price')).toBe('Не больше 1 000 000 ₸')
    expect(messageFor({ ...valid, price: 1_000_000 }, 'price')).toBeUndefined()
  })
})
