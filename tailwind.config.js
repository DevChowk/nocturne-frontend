/** @type {import('tailwindcss').Config} */

// Every color token points at a CSS custom property defined in src/index.css.
// The custom properties flip on `data-theme="light"` / `data-theme="dark"`
// (and via `prefers-color-scheme: dark` when the user picks "system"), so
// `bg-surface`, `text-on-surface`, `border-outline`, etc. respond to theme
// automatically without touching any component.
//
// `<alpha-value>` is Tailwind's placeholder — it lets `bg-primary/40`,
// `shadow-primary/20`, `ring-primary/30` etc. keep working exactly as
// before. The custom properties are stored as `R G B` (space-separated),
// which is what modern rgb() with slash-alpha needs.
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accents — same value in both themes.
        primary: withAlpha('--color-primary-rgb'),
        'primary-dim': withAlpha('--color-primary-dim-rgb'),
        'primary-fixed': '#FFDF33',
        'primary-fixed-dim': withAlpha('--color-primary-rgb'),
        'primary-container': withAlpha('--color-primary-dim-rgb'),
        'on-primary': '#14000A',
        'on-primary-fixed': '#14000A',
        'on-primary-fixed-variant': '#3A0F00',
        'on-primary-container': '#14000A',
        secondary: withAlpha('--color-secondary-rgb'),
        'secondary-dim': '#2B3EE0',
        'secondary-fixed': '#6E7EFF',
        'secondary-fixed-dim': withAlpha('--color-secondary-rgb'),
        'secondary-container': withAlpha('--color-secondary-rgb'),
        'on-secondary': '#FFFFFF',
        'on-secondary-container': '#EEF0FF',
        'on-secondary-fixed': '#00062E',
        'on-secondary-fixed-variant': '#1A2A99',
        tertiary: withAlpha('--color-tertiary-rgb'),
        'tertiary-dim': '#E63838',
        'tertiary-fixed': '#FF6E6E',
        'tertiary-fixed-dim': withAlpha('--color-tertiary-rgb'),
        'tertiary-container': withAlpha('--color-tertiary-rgb'),
        'on-tertiary': '#FFFFFF',
        'on-tertiary-container': '#3A0000',
        'on-tertiary-fixed': '#3A0000',
        'on-tertiary-fixed-variant': '#7A0F0F',
        error: withAlpha('--color-tertiary-rgb'),
        'error-dim': '#E63838',
        'error-container': withAlpha('--color-tertiary-rgb'),
        'on-error': '#FFFFFF',
        'on-error-container': '#FFE0E0',

        // Surfaces + text — flip on theme.
        background: withAlpha('--color-bg-rgb'),
        'on-background': withAlpha('--color-on-surface-rgb'),
        surface: withAlpha('--color-bg-rgb'),
        'surface-dim': withAlpha('--color-bg-rgb'),
        'surface-bright': withAlpha('--color-surface-highest-rgb'),
        'surface-container-lowest': withAlpha('--color-bg-rgb'),
        'surface-container-low': withAlpha('--color-surface-low-rgb'),
        'surface-container': withAlpha('--color-surface-rgb'),
        'surface-container-high': withAlpha('--color-surface-high-rgb'),
        'surface-container-highest': withAlpha('--color-surface-highest-rgb'),
        'surface-variant': withAlpha('--color-surface-highest-rgb'),
        'surface-tint': withAlpha('--color-primary-rgb'),
        'on-surface': withAlpha('--color-on-surface-rgb'),
        'on-surface-variant': withAlpha('--color-on-surface-variant-rgb'),
        outline: withAlpha('--color-outline-rgb'),
        'outline-variant': withAlpha('--color-outline-variant-rgb'),
        'inverse-primary': '#14000A',
        'inverse-surface': withAlpha('--color-on-surface-rgb'),
        'inverse-on-surface': withAlpha('--color-bg-rgb'),
        // The signature sticker stroke — near-black in light, paper-white in dark.
        stroke: withAlpha('--color-stroke-rgb'),
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      borderWidth: {
        sticker: '2px',
      },
      boxShadow: {
        // These reference the same CSS var as .btn-sticker so they flip
        // with theme too. Callsites that want the sticker shadow without
        // the full .btn-sticker class can use `shadow-sticker`.
        sticker: '4px 4px 0 rgb(var(--color-stroke-rgb))',
        'sticker-sm': '2px 2px 0 rgb(var(--color-stroke-rgb))',
        'sticker-lg': '6px 6px 0 rgb(var(--color-stroke-rgb))',
      },
      fontFamily: {
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
        label: ['Manrope', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
