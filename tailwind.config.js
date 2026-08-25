/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        myland: {
          red: '#E4292F',
          redDark: '#B81E23',
          ink: '#1A1D1F',
          gold: '#C9A24B',
          goldLight: '#E4C77E',
          cream: '#FAF8F5',
          slate: '#5B6470',
          mist: '#EFEDE8',
        },
      },
      fontFamily: {
        display: ['"Montserrat"', 'sans-serif'],
        body: ['"Poppins"', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(26, 29, 31, 0.12)',
        card: '0 4px 24px -4px rgba(26, 29, 31, 0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
    },
  },
  plugins: [],
};
