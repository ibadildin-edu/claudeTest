import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router/dom'
import { createAppRouter } from '@/app/router'
import { makeStore } from '@/app/store'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root element is missing in index.html')

const store = makeStore()
const router = createAppRouter()

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
