/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        casino: {
          dark: '#0a0a0a',
          darker: '#050505',
          gold: '#d4af37',
          'gold-light': '#f4e4bc',
          red: '#dc2626',
          green: '#16a34a',
        },
      },
      fontFamily: {
        casino: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
