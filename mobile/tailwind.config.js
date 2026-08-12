/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#53FC18',
        theme: {
          background: {
            light: '#F8F8FA',
            dark: '#0B0B0D',
          },
          foreground: {
            light: '#18181B',
            dark: '#F4F4F5',
          },
          surface: {
            light: '#FFFFFF',
            dark: '#17171A',
          },
          muted: {
            light: '#71717A',
            dark: '#A1A1AA',
          },
          border: {
            light: '#E4E4E7',
            dark: '#2A2A2F',
          },
        },
      },
    },
  },
  plugins: [],
};
