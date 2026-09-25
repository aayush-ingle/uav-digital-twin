/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#070b14',
          cyan: '#00f0ff',
          blue: '#0070f3',
          purple: '#a855f7',
          emerald: '#10b981',
          amber: '#f59e0b',
          crimson: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
