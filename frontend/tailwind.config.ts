import type { Config } from 'tailwindcss'
import { palette } from './src/theme/palette.ts'

// Loaded from src/index.css via `@config`. Tailwind v4 finds sources automatically.
export default {
  theme: {
    extend: {
      colors: palette,
      fontFamily: {
        sans: ['"Manrope Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(37 26 19 / 0.04), 0 8px 24px -12px rgb(37 26 19 / 0.12)',
        overlay: '0 24px 64px -16px rgb(37 26 19 / 0.35)',
      },
      // Live feed of orders. The duration is FEED_TRANSITION_MS in src/lib/useFeedTransitions.ts.
      keyframes: {
        'feed-enter': {
          from: { gridTemplateRows: '0fr', opacity: '0', transform: 'translateY(-0.75rem)' },
          to: { gridTemplateRows: '1fr', opacity: '1', transform: 'translateY(0)' },
        },
        'feed-exit': {
          from: { gridTemplateRows: '1fr', opacity: '1' },
          to: { gridTemplateRows: '0fr', opacity: '0' },
        },
      },
      animation: {
        'feed-enter': 'feed-enter 500ms cubic-bezier(0.2, 0, 0, 1) both',
        'feed-exit': 'feed-exit 500ms cubic-bezier(0.2, 0, 0, 1) both',
      },
    },
  },
} satisfies Config
