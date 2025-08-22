/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        game: {
          bg: '#f8fafc',
          grid: '#e2e8f0',
          piece1: '#FF6B6B',
          piece2: '#4ECDC4', 
          piece3: '#45B7D1',
          piece4: '#96CEB4',
          piece5: '#FFEAA7',
          piece6: '#DDA0DD',
          piece7: '#98D8C8',
          piece8: '#F7DC6F',
        }
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'bounce-in': 'bounceIn 0.5s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { 
            transform: 'scale(0.3)',
            opacity: '0'
          },
          '50%': {
            transform: 'scale(1.05)'
          },
          '70%': {
            transform: 'scale(0.9)'
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1'
          }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { 
            transform: 'translateY(20px)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        }
      }
    },
  },
  plugins: [],
}