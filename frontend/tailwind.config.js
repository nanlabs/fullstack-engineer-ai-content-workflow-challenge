/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'vercel': '0 0 0 1px rgba(0,0,0,.08), 0 2px 5px rgba(0,0,0,.04)',
        'vercel-hover': '0 0 0 1px rgba(0,0,0,.08), 0 5px 10px rgba(0,0,0,.12)',
      },
    },
  },
  plugins: [],
};
