import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0f0f1a',
        'bg-card': '#1a1a2e',
        'accent-purple': '#7c3aed',
        'accent-blue': '#2563eb',
        'theme-bg': 'var(--color-bg)',
        'theme-surface': 'var(--color-surface)',
        'theme-card': 'var(--color-card)',
        'theme-border': 'var(--color-border)',
        'theme-text': 'var(--color-text-primary)',
        'theme-secondary': 'var(--color-text-secondary)',
        'theme-accent': 'var(--color-accent)',
        'theme-accent-hover': 'var(--color-accent-hover)',
        'theme-accent-soft': 'var(--color-accent-soft)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
export default config
