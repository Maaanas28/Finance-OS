/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        terminal: {
          abyss: '#080a0f',       // Primary background (deep void)
          surface: '#0c1017',     // Panel surface
          card: '#101520',        // Card container
          cardHover: '#151c2a',   // Card hover highlight
          border: '#182030',      // Structural grid border
          borderSubtle: '#121824',// Subtle grid divider
          borderHover: '#222d42', // Interactive border hover
          accent: '#3b82f6',      // Restrained technical blue indicator
          gain: '#10b981',        // Restrained financial emerald green
          gainDim: 'rgba(16, 185, 129, 0.08)',
          loss: '#ef4444',        // Restrained financial crimson red
          lossDim: 'rgba(239, 68, 68, 0.08)',
          warn: '#f59e0b',        // Financial amber warning
          warnDim: 'rgba(245, 158, 11, 0.08)',
          info: '#0ea5e9',        // Slate cyan
          textPrimary: '#f8fafc', // Primary high-contrast text
          textSecondary: '#94a3b8', // Muted metadata text
          textMuted: '#64748b',   // Low-contrast label text
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        terminal: '0 2px 10px rgba(0, 0, 0, 0.5), 0 0 0 1px #182030',
        terminalPanel: '0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
      },
    },
  },
  plugins: [],
};
