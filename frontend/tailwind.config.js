/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1c1e20',        // graphite
        graphite: '#2a2d30',
        paper: '#f6f3ee',      // warm off-white
        stone: '#e6e1d8',
        concrete: '#8a8d90',
        ember: '#d4501a',      // burnt orange accent
        'ember-dark': '#b84214',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,30,32,.06), 0 12px 32px -12px rgba(28,30,32,.18)',
      },
      maxWidth: { site: '1280px' },
    },
  },
  plugins: [],
};
