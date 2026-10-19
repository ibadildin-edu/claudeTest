import type { ComponentType } from 'react'
import type { Params } from 'react-router'

export type HeaderFilter = 'period' | 'location' | 'live'

/** `handle` of a route: what the layout header shows for it. */
export interface RouteHandle {
  /** A string, or a component for titles that depend on data (a location name). */
  title: string | ComponentType<{ params: Params }>
  description?: string
  filters?: readonly HeaderFilter[]
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null && 'title' in value
}
