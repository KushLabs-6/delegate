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
        brand: {
          DEFAULT: '#FACC15', // Vibrant Bright Yellow (yellow-400)
          yellow: '#FACC15',
          dark: '#EAB308', // Amber/Yellow-500
          light: '#FEF08A', // Yellow-200
          glow: '#EEFC1A', // Bright Neon Volt
          background: '#09090b', // Midnight Zinc/Charcoal background
        },
        dark: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#27272a',
          800: '#18181b',
          900: '#09090b',
          950: '#030303',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '1rem',
        'inner': '0.75rem',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon': '0 0 15px rgba(250, 204, 21, 0.15)',
        'neon-strong': '0 0 25px rgba(250, 204, 21, 0.3)',
      }
    },
  },
  plugins: [],
}
