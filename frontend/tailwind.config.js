/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0D2B6B',
          800: '#0F1F4D',
          700: '#1C3A8C',
        },
        ok: '#00C853',
        warn: '#FFC107',
        danger: '#D32F2F',
        muted: '#6B7280',
        surface: '#F7F8FA',
        card: '#FFFFFF',
        border: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Montserrat', 'Poppins', 'Nunito Sans', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
