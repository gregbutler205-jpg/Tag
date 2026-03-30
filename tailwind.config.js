export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#04080f',
          900: '#070e1c',
          800: '#0c1628',
          700: '#122040',
          600: '#1a2f58',
          500: '#1e3a6e',
        },
        brand: {
          blue: {
            DEFAULT: '#1d4ed8',
            light: '#3b82f6',
            dark: '#1e3a8a',
          },
          yellow: {
            DEFAULT: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
          },
        },
      },
      boxShadow: {
        plate:        '0 4px 24px 0 rgba(245,158,11,0.10), 0 1px 6px 0 rgba(0,0,0,0.5)',
        glow:         '0 0 20px rgba(59,130,246,0.3)',
        'glow-yellow':'0 0 20px rgba(245,158,11,0.3)',
      },
    },
  },
  plugins: [],
}
