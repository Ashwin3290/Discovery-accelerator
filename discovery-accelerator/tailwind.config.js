/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'primary': '#4CAF50',
        'primary-hover': '#45a049',
        'header': '#2c3e50',
        'card-bg': '#f0f2f6',
      },
      boxShadow: {
        'button': '0 4px 8px rgba(0,0,0,0.1)',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [],
}