/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        // Warm palette remaps: every legacy slate/indigo/orange/amber utility now renders in the PetPaws theme
        slate: {
          50: '#FAF6F0', 100: '#F3ECE0', 200: '#E6DCCF', 300: '#D8CEBE', 400: '#A39A8E',
          500: '#7A7168', 600: '#65605B', 700: '#4A4344', 800: '#342E2F', 900: '#231F20',
        },
        indigo: {
          50: '#F2F7F4', 100: '#E2EFE8', 200: '#C5DFD2', 300: '#9CC5B1', 400: '#75A794',
          500: '#52796F', 600: '#3F6359', 700: '#2F4F46', 800: '#243D36', 900: '#1B2D28',
        },
        orange: {
          50: '#FFF5F0', 100: '#FFE7DC', 200: '#FFD0BD', 300: '#F8AE95', 400: '#EE927A',
          500: '#E07A5F', 600: '#D0654A', 700: '#B04E36', 800: '#8C3F2C', 900: '#6B3022',
        },
        amber: {
          50: '#FFF8EB', 100: '#FDEBC8', 200: '#FAD79A', 300: '#F6C06B', 400: '#F4A261',
          500: '#E8924A', 600: '#D17B35', 700: '#B0622A', 800: '#8A4C22', 900: '#6B3B1C',
        },
        canvas: {
          50: '#FAF6F0',   // Warm organic linen canvas (ultra eye-comfort)
          100: '#F5EFE6',  // Soft vanilla cream
          200: '#EBE2D5',
        },
        sage: {
          50: '#F2F7F4',
          100: '#E2EFE8',
          200: '#C5DFD2',
          500: '#52796F',   // Soothing Eucalyptus Sage Primary
          600: '#3A5A40',
          700: '#2A4433',
        },
        terracotta: {
          50: '#FFF5F0',
          100: '#FFE7DC',
          500: '#E07A5F',   // Soft Warm Terracotta Primary
          600: '#D96B43',
          700: '#BC5333',
        },
        honey: {
          50: '#FFFDF0',
          100: '#FEF9C3',
          500: '#F4A261',   // Soft Warm Honey Accent
          600: '#E76F51',
        },
        espresso: {
          900: '#231F20',   // Eye-comfort warm deep charcoal (no pure black)
          800: '#342E2F',
          700: '#4A4344',
          500: '#686061',
        }
      },
      keyframes: {
        floatY: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } },
        drift: { '0%': { transform: 'translateY(0) rotate(var(--r,0deg))', opacity: '0' }, '15%': { opacity: '.5' }, '100%': { transform: 'translateY(-110vh) rotate(calc(var(--r,0deg) + 40deg))', opacity: '0' } },
        riseIn: { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        wiggle: { '0%,100%': { transform: 'rotate(-4deg)' }, '50%': { transform: 'rotate(4deg)' } },
        blink: { '0%,92%,100%': { transform: 'scaleY(1)' }, '96%': { transform: 'scaleY(.1)' } },
      },
      animation: {
        floatY: 'floatY 5s ease-in-out infinite',
        drift: 'drift 14s linear infinite',
        riseIn: 'riseIn .7s cubic-bezier(.16,1,.3,1) both',
        wiggle: 'wiggle 1.6s ease-in-out infinite',
        blink: 'blink 4s infinite',
      },
      boxShadow: {
        'aesthetic': '0 10px 30px -5px rgba(82, 121, 111, 0.08), 0 4px 12px -2px rgba(224, 122, 95, 0.05)',
        'aesthetic-hover': '0 20px 45px -10px rgba(224, 122, 95, 0.16), 0 8px 20px -4px rgba(58, 90, 64, 0.08)',
        'soft-glass': '0 8px 32px 0 rgba(82, 121, 111, 0.05)',
      }
    },
  },
  plugins: [],
}
