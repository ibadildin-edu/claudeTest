import { baseApi, LIST_ID } from './baseApi'
import type { Product, ProductCreate, ProductsQuery, ProductUpdate } from './types'

export interface UpdateProductArgs {
  id: number
  patch: ProductUpdate
}

export const productsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query<Product[], ProductsQuery>({
      query: (params) => ({ url: '/products', params }),
      providesTags: (result) => [
        { type: 'Product', id: LIST_ID },
        ...(result?.map(({ id }) => ({ type: 'Product' as const, id })) ?? []),
      ],
    }),
    getProduct: build.query<Product, number>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    createProduct: build.mutation<Product, ProductCreate>({
      query: (body) => ({ url: '/products', method: 'POST', body }),
      invalidatesTags: [{ type: 'Product', id: LIST_ID }, 'Analytics'],
    }),
    // Order items show product names, so a rename has to refresh orders as well.
    updateProduct: build.mutation<Product, UpdateProductArgs>({
      query: ({ id, patch }) => ({ url: `/products/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: LIST_ID },
        'Analytics',
        'Order',
      ],
    }),
    // Soft delete: the backend sets isActive = false and keeps order history intact.
    deleteProduct: build.mutation<void, number>({
      query: (id) => ({ url: `/products/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Product', id },
        { type: 'Product', id: LIST_ID },
        'Analytics',
      ],
    }),
  }),
})

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi
