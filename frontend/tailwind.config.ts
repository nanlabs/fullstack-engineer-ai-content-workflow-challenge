import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
      },
      boxShadow: {
        soft: '0 24px 60px -40px rgba(15, 23, 42, 0.35)',
        panel: '0 20px 40px -30px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config
