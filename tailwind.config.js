/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'assembly-dark': '#1a1a2e',
        'assembly-darker': '#0f0f1e',
        'assembly-purple': '#667eea',
        'assembly-purple-dark': '#764ba2',
        'assembly-pink': '#f093fb',
        'assembly-pink-dark': '#f5576c',
        'assembly-green': '#76ff03',
        'assembly-green-dark': '#4caf50',
        // Persona colors
        'jerry': '#ffeb3b',
        'nyro': '#9c27b0',
        'aureon': '#4caf50',
        'jamai': '#ff9800',
        'synth': '#2196f3',
      },
      backgroundImage: {
        'gradient-main': 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)',
        'gradient-mic': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-mic-listening': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      animation: {
        'slide-in': 'slideIn 0.5s ease',
        'pulse-slow': 'pulse 1.5s infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
