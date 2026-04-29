/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ========================================
        // NUEVA PALETA SALURAMA 2026
        // ========================================
        
        // Primario: Azul profundo (Autoridad, Confianza)
        primary: {
          50: '#E8ECF3',
          100: '#C5D0E0',
          200: '#9FB0C9',
          300: '#7589AD',
          400: '#526894',
          500: '#1E3A5F',  // ← COLOR PRINCIPAL
          600: '#1A3254',
          700: '#152844',
          800: '#111F35',
          900: '#0D1829',
          950: '#0A121F',
        },
        
        // Secundario: Verde menta (Salud, Verificación, Frescura)
        secondary: {
          50: '#E8F7F5',
          100: '#C5EAE5',
          200: '#9FD8CD',
          300: '#75BFB0',
          400: '#52A592',
          500: '#2A9D8F',  // ← COLOR SECUNDARIO
          600: '#248A7D',
          700: '#1D6F65',
          800: '#17554D',
          900: '#12423D',
          950: '#0A2925',
        },
        
        // Terciario: Violeta (Innovación, Tecnología, Verificación Digital)
        tertiary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',  // ← COLOR TERCIARIO
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2E1065',
        },
        
        // Neutral: Gris profesional (Texto, Bordes)
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4A5568',  // ← GRIS PRINCIPAL
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#0B0F19',
        },
        
        // Semantic colors (para estados)
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
      },
      
      fontFamily: {
        headline: ['Fraunces', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        label: ['DM Sans', 'sans-serif'],
      },
      
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.375rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        full: '9999px',
      },
      
      boxShadow: {
        sm: '0 1px 2px 0 rgba(30, 58, 95, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(30, 58, 95, 0.1), 0 1px 2px 0 rgba(30, 58, 95, 0.06)',
        md: '0 4px 6px -1px rgba(30, 58, 95, 0.1), 0 2px 4px -1px rgba(30, 58, 95, 0.06)',
        lg: '0 10px 15px -3px rgba(30, 58, 95, 0.1), 0 4px 6px -2px rgba(30, 58, 95, 0.05)',
        xl: '0 20px 25px -5px rgba(30, 58, 95, 0.1), 0 10px 10px -5px rgba(30, 58, 95, 0.04)',
      },
    },
  },
  plugins: [],
}