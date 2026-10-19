import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '@/api/types'
import { ProductForm } from './ProductForm'

const categories: Category[] = [
  { id: 1, name: 'Кофе', color: '#E05A2B', sortOrder: 1 },
  { id: 2, name: 'Чай', color: '#0F8F8A', sortOrder: 2 },
]

function renderForm(onSubmit = vi.fn(async () => {})) {
  render(<ProductForm categories={categories} submitLabel="Добавить" onSubmit={onSubmit} onCancel={vi.fn()} />)
  return { user: userEvent.setup(), onSubmit }
}

describe('ProductForm', () => {
  it('shows zod messages and does not submit an empty form', async () => {
    const { user, onSubmit } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Укажите название')).toBeInTheDocument()
    expect(screen.getByText('Выберите категорию')).toBeInTheDocument()
    expect(screen.getByText('Укажите цену')).toBeInTheDocument()
    expect(screen.getByLabelText('Название')).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a fractional price', async () => {
    const { user, onSubmit } = renderForm()

    await user.type(screen.getByLabelText('Название'), 'Латте')
    await user.selectOptions(screen.getByLabelText('Категория'), '1')
    await user.type(screen.getByLabelText('Цена'), '1500.5')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Цена — целое число тенге, без копеек')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits typed values: numbers as numbers, the name trimmed', async () => {
    const { user, onSubmit } = renderForm()

    await user.type(screen.getByLabelText('Название'), '  Матча латте ')
    await user.selectOptions(screen.getByLabelText('Категория'), '2')
    await user.type(screen.getByLabelText('Цена'), '1900')
    await user.click(screen.getByLabelText('Показывать в меню'))
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Матча латте', categoryId: 2, price: 1900, isActive: false })
  })

  it('maps a 409 from the API to the name field', async () => {
    const onSubmit = vi.fn(async () => {
      throw { status: 409, data: { detail: 'Product with this name already exists' } }
    })
    const { user } = renderForm(onSubmit)

    await user.type(screen.getByLabelText('Название'), 'Капучино')
    await user.selectOptions(screen.getByLabelText('Категория'), '1')
    await user.type(screen.getByLabelText('Цена'), '1500')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Позиция с таким названием уже есть')).toBeInTheDocument()
  })
})
