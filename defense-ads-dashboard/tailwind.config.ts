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
      },
    },
  },
  plugins: [],
}
export default config
