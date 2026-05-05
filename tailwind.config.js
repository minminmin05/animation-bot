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
        },
        navy: {
          DEFAULT: '#1a2744',
          light: '#2a3a5c',
        },
        coral: '#ff6b6b',
        gold: '#f4a261',
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
        soft: '0 4px 20px rgba(26, 39, 68, 0.08)',
        medium: '0 8px 30px rgba(26, 39, 68, 0.12)',
        strong: '0 12px 40px rgba(26, 39, 68, 0.16)',
        glow: '0 0 40px rgba(224, 122, 95, 0.15)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          to: { transform: 'translateX(100%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(224, 122, 95, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(224, 122, 95, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
