/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        clay: {
          primary: '#0a0a0a',
          'primary-active': '#1f1f1f',
          'primary-disabled': '#e5e5e5',
          ink: '#0a0a0a',
          body: '#3a3a3a',
          'body-strong': '#1a1a1a',
          muted: '#6a6a6a',
          'muted-soft': '#9a9a9a',
          hairline: '#e5e5e5',
          'hairline-soft': '#f0f0f0',
          canvas: '#fffaf0',
          'surface-soft': '#faf5e8',
          'surface-card': '#f5f0e0',
          'surface-strong': '#ebe6d6',
          'surface-dark': '#0a1a1a',
          'surface-dark-elevated': '#1a2a2a',
          pink: '#ff4d8b',
          teal: '#1a3a3a',
          lavender: '#b8a4ed',
          peach: '#ffb084',
          ochre: '#e8b94a',
          mint: '#a4d4c5',
          coral: '#ff6b5a',
        },
        marrow: {
          DEFAULT: '#00A389',
          light: '#14B8A6',
          dark: '#0B7A68',
        },
        prepladder: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          dark: '#4338CA',
        },
      },
      borderRadius: {
        'clay-xs': '6px',
        'clay-sm': '8px',
        'clay-md': '12px',
        'clay-lg': '16px',
        'clay-xl': '24px',
        'clay-pill': '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
