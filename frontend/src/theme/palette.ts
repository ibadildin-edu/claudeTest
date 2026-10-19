/**
 * Design tokens from design/dashboard.png.
 * Tailwind reads them via tailwind.config.ts; Recharts components import them
 * directly, because SVG charts take colors as props, not as class names.
 */
export const palette = {
  /** Page background, cards, borders and chart tracks. */
  cream: {
    50: '#FFFCF8',
    100: '#FAF5EE',
    200: '#F4EDE3',
    300: '#EADFD1',
    400: '#DCCDBA',
    500: '#C4B19B',
  },
  /** Dark sidebar and text. */
  espresso: {
    300: '#B9A592',
    400: '#937D69',
    500: '#76614F',
    600: '#5B4839',
    700: '#3F2F24',
    800: '#31241B',
    900: '#251A13',
  },
  /** Orange accent: current period, live indicator, primary actions. */
  brand: {
    50: '#FDF2EC',
    100: '#FBE4D8',
    200: '#F7C9B2',
    300: '#F0A685',
    400: '#E87F56',
    500: '#E05A2B',
    600: '#C84A1E',
    700: '#A23C19',
  },
  success: {
    100: '#E0F0E2',
    600: '#2F7A47',
  },
  danger: {
    100: '#FBE3DD',
    600: '#B4412C',
  },
  /** Category colors, same values as categories.color in the database. */
  category: {
    coffee: '#E05A2B',
    tea: '#0F8F8A',
    bakery: '#C8901A',
    desserts: '#A2452F',
  },
  /** Heatmap scale from "no orders" to the busiest hour. */
  heat: {
    0: '#F6EEE6',
    1: '#F9DFCF',
    2: '#F4C6A9',
    3: '#EDA680',
    4: '#E4834F',
    5: '#D06433',
    6: '#A9471F',
    7: '#7A3014',
  },
} as const
