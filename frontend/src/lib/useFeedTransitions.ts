import { useEffect, useState, type Key } from 'react'

/** Must match the duration of `animate-feed-enter` and `animate-feed-exit` in tailwind.config.ts. */
export const FEED_TRANSITION_MS = 500

export type FeedPhase = 'enter' | 'idle' | 'exit'

export interface FeedEntry<T> {
  key: Key
  item: T
  phase: FeedPhase
}

interface FeedState<T> {
  source: readonly T[]
  entries: FeedEntry<T>[]
}

function idleEntries<T>(items: readonly T[], getKey: (item: T) => Key): FeedEntry<T>[] {
  return items.map((item) => ({ key: getKey(item), item, phase: 'idle' }))
}

function nextEntries<T>(previous: FeedEntry<T>[], items: readonly T[], getKey: (item: T) => Key): FeedEntry<T>[] {
  const keys = new Set(items.map(getKey))
  const shown = previous.filter((entry) => entry.phase !== 'exit')
  // Nothing in common with what was shown (e.g. another location): replace without animation.
  if (shown.length > 0 && !shown.some((entry) => keys.has(entry.key))) return idleEntries(items, getKey)

  const phases = new Map(shown.map((entry) => [entry.key, entry.phase]))
  const current = items.map<FeedEntry<T>>((item) => {
    const key = getKey(item)
    return { key, item, phase: phases.get(key) ?? 'enter' }
  })
  const leaving = previous
    .filter((entry) => !keys.has(entry.key))
    .map<FeedEntry<T>>((entry) => ({ ...entry, phase: 'exit' }))
  return [...current, ...leaving]
}

function settle<T>(state: FeedState<T>): FeedState<T> {
  return {
    ...state,
    entries: state.entries
      .filter((entry) => entry.phase !== 'exit')
      .map((entry) => (entry.phase === 'enter' ? { ...entry, phase: 'idle' } : entry)),
  }
}

/**
 * Enter and exit phases for a feed where new items appear at the top and old ones drop off the
 * bottom. Items that left the list stay rendered as `exit` for one transition, so that the feed
 * keeps its height while new items expand. The first list is shown without animation.
 */
export function useFeedTransitions<T>(items: readonly T[], getKey: (item: T) => Key): FeedEntry<T>[] {
  const [state, setState] = useState<FeedState<T>>(() => ({ source: items, entries: idleEntries(items, getKey) }))

  let current = state
  if (state.source !== items) {
    // Derived from props during render, as React recommends instead of an effect.
    current = { source: items, entries: nextEntries(state.entries, items, getKey) }
    setState(current)
  }

  const { entries } = current
  useEffect(() => {
    if (entries.every((entry) => entry.phase === 'idle')) return
    const timer = setTimeout(() => setState(settle), FEED_TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [entries])

  return entries
}
