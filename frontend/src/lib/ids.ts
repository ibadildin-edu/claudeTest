/** Route params are strings; `/orders/abc` must not turn into a request for NaN. */
export function parseId(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
