/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        yellow: {
          400: '#FFD700',
          500: '#FFC000',
        },
      },
    },
  },
  plugins: [],
};