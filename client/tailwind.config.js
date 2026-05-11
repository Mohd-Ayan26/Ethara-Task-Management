/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'neon-cyan': '#00f5ff',
        'neon-pink': '#ff0090',
        'neon-purple': '#bf00ff',
        'neon-green': '#00ff41',
        'bg-void': '#020408',
        'bg-dark': '#060d14',
        'bg-panel': '#0a1628',
        'bg-card': '#0d1f36',
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
