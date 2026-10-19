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
    },
  },
} satisfies Config
