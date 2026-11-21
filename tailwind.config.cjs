/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        deck: {
          950: '#0a0a0b',
          900: '#131316',
          850: '#18181c',
          800: '#1e1e24',
          700: '#26262b',
          600: '#33333a',
          500: '#44444d'
        },
        signal: {
          DEFAULT: '#34d399',
          hover: '#5fdeb0',
          dim: 'rgba(52,211,153,0.12)'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk Variable"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Space Grotesk Variable"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'Cascadia Mono', 'Consolas', 'monospace']
      },
      borderRadius: {
        panel: '6px'
      }
    }
  },
  plugins: []
}
