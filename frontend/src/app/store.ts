import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { baseApi } from '@/api/baseApi'
import { filtersReducer } from '@/features/filters/filtersSlice'

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  filters: filtersReducer,
})

export type RootState = ReturnType<typeof rootReducer>

export function makeStore(preloadedState?: Partial<RootState>) {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
  // refetchOnFocus / refetchOnReconnect and pausing polling in a hidden tab.
  setupListeners(store.dispatch)
  return store
}

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']
