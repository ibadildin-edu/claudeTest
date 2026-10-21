// Readable names for the types generated from openapi.json (`npm run gen:api` → schema.ts).
import type { components, paths } from './schema'

type Schemas = components['schemas']
type QueryParams<Path extends keyof paths> = paths[Path] extends {
  get: { parameters: { query?: infer Query } }
}
  ? NonNullable<Query>
  : never

export type Location = Schemas['LocationRead']
export type Category = Schemas['CategoryRead']

export type Product = Schemas['ProductRead']
export type ProductCreate = Schemas['ProductCreate']
export type ProductUpdate = Schemas['ProductUpdate']
export type ProductsQuery = QueryParams<'/api/v1/products'>

export type OrderStatus = Schemas['OrderStatus']
export type OrderSort = Schemas['OrderSort']
export type OrderListItem = Schemas['OrderListItem']
export type Order = Schemas['OrderRead']
export type OrderItem = Schemas['OrderItemRead']
export type OrdersPage = Schemas['Page_OrderListItem_']
export type OrdersQuery = QueryParams<'/api/v1/orders'>

export type Kpi = Schemas['Kpi']
export type Metric = Schemas['Metric']
export type BestProduct = Schemas['BestProduct']
export type RevenueDailyPoint = Schemas['RevenueDailyPoint']
export type TopProduct = Schemas['TopProduct']
export type CategoryShare = Schemas['CategoryShare']
export type CategoryShareItem = Schemas['CategoryShareItem']
export type HeatmapCell = Schemas['HeatmapCell']
export type LocationCompareItem = Schemas['LocationCompareItem']

/** dateFrom, dateTo, locationId: shared by every /analytics endpoint. */
export type AnalyticsQuery = QueryParams<'/api/v1/analytics/kpi'>
export type TopProductsQuery = QueryParams<'/api/v1/analytics/top-products'>

export type SimulatorStatus = Schemas['SimulatorStatus']
export type SimulatorIdleReason = Schemas['SimulatorIdleReason']

export type ValidationError = Schemas['ValidationError']

/** What the UI always sends to /analytics: an explicit date range and an optional location. */
export interface AnalyticsParams {
  dateFrom: string
  dateTo: string
  locationId?: number
}
