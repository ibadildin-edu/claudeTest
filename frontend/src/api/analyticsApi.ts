import { baseApi } from './baseApi'
import type {
  AnalyticsQuery,
  CategoryShare,
  HeatmapCell,
  Kpi,
  LocationCompareItem,
  RevenueDailyPoint,
  TopProduct,
  TopProductsQuery,
} from './types'

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getKpi: build.query<Kpi, AnalyticsQuery>({
      query: (params) => ({ url: '/analytics/kpi', params }),
      providesTags: ['Analytics'],
    }),
    getRevenueDaily: build.query<RevenueDailyPoint[], AnalyticsQuery>({
      query: (params) => ({ url: '/analytics/revenue-daily', params }),
      providesTags: ['Analytics'],
    }),
    getTopProducts: build.query<TopProduct[], TopProductsQuery>({
      query: (params) => ({ url: '/analytics/top-products', params }),
      providesTags: ['Analytics'],
    }),
    getCategoryShare: build.query<CategoryShare, AnalyticsQuery>({
      query: (params) => ({ url: '/analytics/category-share', params }),
      providesTags: ['Analytics'],
    }),
    getHeatmap: build.query<HeatmapCell[], AnalyticsQuery>({
      query: (params) => ({ url: '/analytics/heatmap', params }),
      providesTags: ['Analytics'],
    }),
    getLocationsCompare: build.query<LocationCompareItem[], AnalyticsQuery>({
      query: (params) => ({ url: '/analytics/locations-compare', params }),
      providesTags: ['Analytics'],
    }),
  }),
})

export const {
  useGetKpiQuery,
  useGetRevenueDailyQuery,
  useGetTopProductsQuery,
  useGetCategoryShareQuery,
  useGetHeatmapQuery,
  useGetLocationsCompareQuery,
} = analyticsApi
