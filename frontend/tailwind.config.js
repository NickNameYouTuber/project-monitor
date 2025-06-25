/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Основные цвета интерфейса
        'primary': 'var(--color-primary)',
        'secondary': 'var(--color-secondary)',
        'accent': 'var(--color-accent)',
        
        // Цвета текста
        'text': {
          'primary': 'var(--text-primary)',
          'secondary': 'var(--text-secondary)',
          'muted': 'var(--text-muted)',
        },
        
        // Фоны
        'bg': {
          'primary': 'var(--bg-primary)',
          'secondary': 'var(--bg-secondary)',
          'card': 'var(--bg-card)',
          'header': 'var(--bg-header)',
          'overlay': 'var(--bg-overlay)',
        },
        
        // Границы
        'border': {
          'primary': 'var(--border-primary)',
          'secondary': 'var(--border-secondary)',
        },
        
        // Состояния
        'state': {
          'success': 'var(--state-success)',
          'warning': 'var(--state-warning)',
          'error': 'var(--state-error)',
          'info': 'var(--state-info)',
        }
      },
    },
  },
  plugins: [],
};
