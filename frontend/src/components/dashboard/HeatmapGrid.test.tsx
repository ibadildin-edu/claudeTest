import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { HeatmapCell } from '@/api/types'
import { HeatmapGrid } from './HeatmapGrid'
import { heatLevel } from './heatmapModel'

const cells: HeatmapCell[] = [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
  [7, 8, 9].map((hour) => ({
    weekday,
    hour,
    avgOrders: weekday === 5 && hour === 8 ? 16.2 : weekday === 1 && hour === 9 ? 5.8 : 1,
  })),
)

describe('HeatmapGrid', () => {
  it('draws a weekday × hour CSS grid', () => {
    render(<HeatmapGrid cells={cells} />)

    expect(screen.getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual([
      'Пн',
      'Вт',
      'Ср',
      'Чт',
      'Пт',
      'Сб',
      'Вс',
    ])
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['07', '08', '09'])
    expect(screen.getAllByRole('gridcell')).toHaveLength(21)
  })

  it('shows the peak hour until a cell is hovered', () => {
    render(<HeatmapGrid cells={cells} />)

    expect(screen.getByText(/суббота, 08:00–09:00 · ≈ 16 заказов в час/)).toBeInTheDocument()

    fireEvent.pointerOver(screen.getByRole('gridcell', { name: /^вторник, 09:00–10:00/ }))
    expect(screen.getByText('вторник, 09:00–10:00 · ≈ 5,8 заказа в час')).toBeInTheDocument()
  })

  it('maps values onto the color scale', () => {
    expect(heatLevel(0, 16)).toBe(0)
    expect(heatLevel(0.1, 16)).toBe(1)
    expect(heatLevel(16, 16)).toBe(7)
  })
})
