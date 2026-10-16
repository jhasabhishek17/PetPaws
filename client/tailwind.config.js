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
      boxShadow: {
        'aesthetic': '0 10px 30px -5px rgba(82, 121, 111, 0.08), 0 4px 12px -2px rgba(224, 122, 95, 0.05)',
        'aesthetic-hover': '0 20px 45px -10px rgba(224, 122, 95, 0.16), 0 8px 20px -4px rgba(58, 90, 64, 0.08)',
        'soft-glass': '0 8px 32px 0 rgba(82, 121, 111, 0.05)',
      }
    },
  },
  plugins: [],
}
