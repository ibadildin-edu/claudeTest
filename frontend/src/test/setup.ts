import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom does not implement scrolling; <ScrollRestoration/> calls it on navigation.
vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)

// Vitest runs without globals, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
