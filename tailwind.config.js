/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5d9e2',
          300: '#b0b8c7',
          400: '#8590a6',
          500: '#67738c',
          600: '#525c72',
          700: '#434b5d',
          800: '#3a404e',
          900: '#252a35',
          950: '#181c25',
        },
        brand: {
          50: '#f0f9f4',
          100: '#dcf2e4',
          200: '#bbe6cd',
          300: '#8ed3aa',
          400: '#5ab980',
          500: '#38a061',
          600: '#25824c',
          700: '#1d683e',
          800: '#1a5334',
          900: '#15442c',
          950: '#0a2719',
        },
        gold: {
          50: '#fbf7ed',
          100: '#f5edd0',
          200: '#ead9a0',
          300: '#ddbf6a',
          400: '#d3a73f',
          500: '#c08f2a',
          600: '#a06d20',
          700: '#7f521e',
          800: '#68421e',
          900: '#58381e',
          950: '#331d0c',
        },
      },
      boxShadow: {
        soft: '0 2px 8px -2px rgba(37, 42, 53, 0.08), 0 4px 16px -4px rgba(37, 42, 53, 0.06)',
        card: '0 1px 3px rgba(37, 42, 53, 0.06), 0 8px 24px -8px rgba(37, 42, 53, 0.12)',
        lift: '0 12px 32px -8px rgba(37, 42, 53, 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
