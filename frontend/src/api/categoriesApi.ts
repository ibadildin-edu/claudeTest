import { baseApi } from './baseApi'
import type { Category } from './types'

export const categoriesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query<Category[], void>({
      query: () => '/categories',
      providesTags: ['Category'],
    }),
  }),
})

export const { useGetCategoriesQuery } = categoriesApi
