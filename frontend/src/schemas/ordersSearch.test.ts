import { describe, expect, it } from 'vitest'
import { hasActiveFilters, parseOrdersSearch, toOrdersQuery, toOrdersSearchParams } from './ordersSearch'

const parse = (query: string) => parseOrdersSearch(new URLSearchParams(query))

describe('orders search params', () => {
  it('parses filters from the URL', () => {
    expect(parse('locationId=2&status=completed&dateFrom=2026-10-01&minTotal=3000&sort=-totalAmount&page=3')).toEqual({
      locationId: 2,
      categoryId: undefined,
      productId: undefined,
      status: 'completed',
      dateFrom: '2026-10-01',
      dateTo: undefined,
      minTotal: 3000,
      maxTotal: undefined,
      sort: '-totalAmount',
      page: 3,
    })
  })

  it('falls back to defaults for garbage instead of sending it to the API', () => {
    const search = parse('locationId=abc&status=lost&dateFrom=2026-13-45&minTotal=-5&sort=price&page=0')
    expect(search.locationId).toBeUndefined()
    expect(search.status).toBeUndefined()
    expect(search.dateFrom).toBeUndefined()
    expect(search.minTotal).toBeUndefined()
    expect(search.sort).toBe('-createdAt')
    expect(search.page).toBe(1)
    expect(hasActiveFilters(search)).toBe(false)
  })

  it('swaps reversed date and amount ranges', () => {
    const search = parse('dateFrom=2026-10-10&dateTo=2026-10-01&minTotal=5000&maxTotal=1000')
    expect([search.dateFrom, search.dateTo]).toEqual(['2026-10-01', '2026-10-10'])
    expect([search.minTotal, search.maxTotal]).toEqual([1000, 5000])
  })

  it('writes back only non-default values and survives a round trip', () => {
    const search = parse('status=preparing&page=2')
    expect(toOrdersSearchParams(search).toString()).toBe('status=preparing&page=2')
    expect(toOrdersSearchParams(parse('')).toString()).toBe('')
    expect(parseOrdersSearch(toOrdersSearchParams(search))).toEqual(search)
  })

  it('adds the page size for the API', () => {
    expect(toOrdersQuery(parse('page=2')).pageSize).toBe(20)
  })
})
