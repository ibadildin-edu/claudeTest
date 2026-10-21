import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FEED_TRANSITION_MS, useFeedTransitions, type FeedEntry } from './useFeedTransitions'

const getKey = (id: number) => id
const phases = (entries: FeedEntry<number>[]) => entries.map(({ item, phase }) => `${item}:${phase}`)

function renderFeed(initial: number[]) {
  return renderHook(({ items }) => useFeedTransitions(items, getKey), { initialProps: { items: initial } })
}

describe('useFeedTransitions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the first list without animation', () => {
    const { result } = renderFeed([3, 2, 1])
    expect(phases(result.current)).toEqual(['3:idle', '2:idle', '1:idle'])
  })

  it('slides new items in and keeps dropped ones until the transition ends', () => {
    const { result, rerender } = renderFeed([3, 2, 1])

    rerender({ items: [5, 4, 3] })
    expect(phases(result.current)).toEqual(['5:enter', '4:enter', '3:idle', '2:exit', '1:exit'])

    act(() => vi.advanceTimersByTime(FEED_TRANSITION_MS))
    expect(phases(result.current)).toEqual(['5:idle', '4:idle', '3:idle'])
  })

  it('keeps an entering item entering when the next update comes mid-transition', () => {
    const { result, rerender } = renderFeed([2, 1])

    rerender({ items: [3, 2] })
    act(() => vi.advanceTimersByTime(FEED_TRANSITION_MS / 2))
    rerender({ items: [4, 3] })
    expect(phases(result.current)).toEqual(['4:enter', '3:enter', '2:exit', '1:exit'])
  })

  it('replaces an unrelated list (another location) without animation', () => {
    const { result, rerender } = renderFeed([3, 2, 1])

    rerender({ items: [30, 20] })
    expect(phases(result.current)).toEqual(['30:idle', '20:idle'])
  })

  it('animates the first items of an empty feed', () => {
    const { result, rerender } = renderFeed([])

    rerender({ items: [1] })
    expect(phases(result.current)).toEqual(['1:enter'])
  })
})
