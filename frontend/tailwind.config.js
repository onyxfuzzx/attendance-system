export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#d97706',
        'primary-dark': '#0a0a0f',
        accent: '#f59e0b',
        'accent-hover': '#d97706',
        secondary: '#1c1917',
        background: '#07070d',
        surface: '#0f0f18',
        'on-surface': '#faf5ef',
        'on-surface-variant': '#8a7e6d',
        outline: '#2a2520',
        error: '#ef4444',
        'surface-elevated': '#161621',
        amber: {
          glow: '#f59e0b',
        }
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        'amber-sm': '0 2px 8px -2px rgba(245, 158, 11, 0.15)',
        'amber-md': '0 8px 24px -4px rgba(245, 158, 11, 0.2)',
        'amber-lg': '0 16px 48px -8px rgba(245, 158, 11, 0.25)',
        'amber-glow': '0 0 40px -8px rgba(245, 158, 11, 0.3)',
        'inner-amber': 'inset 0 1px 0 0 rgba(245, 158, 11, 0.05)',
        'midnight': '0 20px 60px -15px rgba(0, 0, 0, 0.7)',
      },
      backgroundImage: {
        'amber-gradient': 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
        'midnight-gradient': 'linear-gradient(180deg, #0f0f18 0%, #07070d 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(217, 119, 6, 0.01) 100%)',
        'shimmer': 'linear-gradient(110deg, transparent 25%, rgba(245, 158, 11, 0.03) 50%, transparent 75%)',
      },
      animation: {
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}