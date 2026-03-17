module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        panel: {
          bg: '#0f1923',
          surface: '#162231',
          border: '#1e3347',
          hover: '#1a2d42',
        },
        accent: {
          green: '#22c55e',
          red: '#ef4444',
          amber: '#f59e0b',
          blue: '#38bdf8',
        },
      },
    },
  },
  plugins: [],
}
