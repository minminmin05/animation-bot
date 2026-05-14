/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e3a5f',
          light: '#2d4a6f',
        },
        accent: {
          DEFAULT: '#e07a5f',
          hover: '#c96a52',
          light: '#f4a889',
        },
        cream: {
          DEFAULT: '#f9f7f2',
          dark: '#e8e4db',
        },
        sage: {
          DEFAULT: '#7d9a7c',
          light: '#a8c4a7',
          10: 'rgba(125, 154, 124, 0.1)',
          20: 'rgba(125, 154, 124, 0.2)',
        },
        'sage-light': '#a8c4a7',
        navy: {
          DEFAULT: '#1a2744',
          light: '#2a3a5c',
        },
        'navy-light': '#2a3a5c',
        coral: '#ff6b6b',
        'coral-light': '#ff8787',
        gold: '#f4a261',
        'gold-light': '#f4b47a',
        text: {
          primary: '#1a1a2e',
          secondary: '#4a4a5e',
          muted: '#8b8b9e',
          inverse: '#ffffff',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 8px rgba(26, 39, 68, 0.06)',
        medium: '0 8px 24px rgba(26, 39, 68, 0.1)',
        strong: '0 12px 32px rgba(26, 39, 68, 0.14)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-in': 'slideIn 0.25s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
