import { vi } from 'vitest'

const ORIGIN = 'http://localhost'
const NativeRequest = globalThis.Request

/**
 * Minimal fake backend for component tests: `{'/orders/42': {...}}` → JSON responses,
 * anything else → 404. Keys are paths after /api/v1, without the query string.
 */
export function mockApi(routes: Record<string, unknown>) {
  // fetchBaseQuery builds `new Request('/api/v1/...')`; Node needs an absolute URL.
  // The jsdom AbortSignal is not accepted by Node's Request, so it is dropped here.
  class RelativeRequest extends NativeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      const { signal: _signal, ...rest } = init ?? {}
      super(typeof input === 'string' ? new URL(input, ORIGIN) : input, rest)
    }
  }
  vi.stubGlobal('Request', RelativeRequest)

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof NativeRequest ? input.url : String(input), ORIGIN)
    const path = url.pathname.replace(/^\/api\/v1/, '')
    if (!(path in routes)) return Response.json({ detail: 'Not found' }, { status: 404 })
    return Response.json(routes[path])
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
