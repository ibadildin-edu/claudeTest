import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { ValidationError } from './types'

export function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error
}

export function getErrorStatus(error: unknown): FetchBaseQueryError['status'] | undefined {
  return isFetchBaseQueryError(error) ? error.status : undefined
}

export function isNotFoundError(error: unknown): boolean {
  return getErrorStatus(error) === 404
}

function getDetail(error: unknown): unknown {
  if (!isFetchBaseQueryError(error)) return undefined
  const { data } = error
  return typeof data === 'object' && data !== null && 'detail' in data ? data.detail : undefined
}

function isValidationError(value: unknown): value is ValidationError {
  return typeof value === 'object' && value !== null && 'loc' in value && 'msg' in value
}

/** FastAPI 422: `{detail: [{loc: ['body', 'price'], msg}]}` → `{price: msg}`. */
export function getFieldErrors(error: unknown): Record<string, string> {
  const detail = getDetail(error)
  if (getErrorStatus(error) !== 422 || !Array.isArray(detail)) return {}
  const result: Record<string, string> = {}
  for (const item of detail) {
    if (!isValidationError(item)) continue
    const field = item.loc.at(-1)
    if (typeof field === 'string') result[field] = item.msg
  }
  return result
}

export function getErrorMessage(error: unknown): string {
  const status = getErrorStatus(error)
  if (status === 'FETCH_ERROR') return 'Нет связи с сервером. Проверьте, что API запущен на :8000.'
  if (status === 'PARSING_ERROR') return 'Сервер вернул неожиданный ответ.'
  if (typeof status === 'number' && status >= 500) return 'Ошибка на сервере. Попробуйте ещё раз.'
  const detail = getDetail(error)
  if (typeof detail === 'string') return detail
  return 'Не удалось загрузить данные.'
}
