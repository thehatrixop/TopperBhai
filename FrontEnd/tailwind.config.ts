import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        'topper-black': '#0a0a0a',
        'topper-charcoal': '#1a1a1a',
        'topper-graphite': '#2a2a2a',
        'topper-amber': '#f5a623',
        'topper-cyan': '#00d9ff',
        'topper-off-white': '#f0f0f0',
      },
      keyframes: {
        'ink-burst': {
          '0%': { opacity: '1', transform: 'scale(0)' },
          '50%': { opacity: '1' },
          '100%': { opacity: '0', transform: 'scale(1)' },
        },
        'speed-line': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'panel-expand': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'paper-emerge': {
          '0%': { transform: 'translateY(20px) rotateX(90deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotateX(0)', opacity: '1' },
        },
        'seal-stamp': {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'scale(1) rotate(5deg)', opacity: '1' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', boxShadow: '0 0 0 0 rgba(245, 166, 35, 0.4)' },
          '50%': { opacity: '1', boxShadow: '0 0 0 10px rgba(245, 166, 35, 0)' },
        },
      },
      animation: {
        'ink-burst': 'ink-burst 0.6s ease-out',
        'speed-line': 'speed-line 0.4s ease-in-out',
        'panel-expand': 'panel-expand 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'paper-emerge': 'paper-emerge 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'seal-stamp': 'seal-stamp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-glow': 'pulse-glow 2s infinite',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'panel-gap': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
