/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f2f6f4',
          100: '#e1ede7',
          200: '#c2dbcf',
          300: '#97c1af',
          400: '#6aa38d',
          500: '#4d8771',
          600: '#3a6c59',
          700: '#2f5748',
          800: '#28463b',
          900: '#1e2e28',
          950: '#111b17',
        },
        sage: {
          50: '#f5f7f6',
          100: '#e7ece9',
          200: '#d1ddd6',
          300: '#b1c5bc',
          400: '#8ba79c',
          500: '#6c8b7f',
          600: '#4d6a5d',
          700: '#42574d',
          800: '#374740',
          900: '#2f3c36',
        },
        ochre: {
          50: '#fbf7ee',
          100: '#f5ecd5',
          200: '#ecd7aa',
          300: '#dfbc76',
          400: '#d3a04a',
          500: '#c4823f',
          600: '#b06b2b',
          700: '#8e5124',
          800: '#754224',
          900: '#633722',
        },
        warm: {
          bg: '#FBF9F5',
          surface: '#F3EFE8',
          variant: '#E5DFD5',
          border: '#DDD6CA',
          darkBg: '#111513',
          darkSurface: '#181D1B',
          darkVariant: '#252C28',
          darkBorder: '#2E3832',
        },
        bubble: {
          sent: '#2C443B',
          sentText: '#FBF9F5',
          received: '#ECE7DE',
          receivedText: '#1E2E28',
          sentDark: '#2E483E',
          sentTextDark: '#F2F6F3',
          receivedDark: '#202623',
          receivedTextDark: '#E1E4E0',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
