/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#070e0b',
          900: '#0b1411',
          850: '#0f1a16',
          800: '#13211c',
          700: '#1b2d27',
          600: '#26403a',
          500: '#3a5a51',
          400: '#5f8277',
          300: '#94b3a8',
          200: '#c4d8d0',
          100: '#e9f2ee',
        },
        sun: '#ffd166',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.06), 0 18px 50px -20px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
};
