/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          bg: "#F8FAFC",
          card: "#FFFFFF",
          text: "#1E293B",
          muted: "#64748B",
          border: "#E2E8F0",
          lavender: {
            light: "#F3F0FF",
            border: "#E9D5FF",
            main: "#8B5CF6",
            text: "#6D28D9"
          },
          mint: {
            light: "#ECFDF5",
            border: "#A7F3D0",
            main: "#10B981",
            text: "#047857"
          },
          blue: {
            light: "#F0F9FF",
            border: "#BAE6FD",
            main: "#0284C7",
            text: "#0369A1"
          },
          peach: {
            light: "#FFFBEB",
            border: "#FDE68A",
            main: "#F59E0B",
            text: "#B45309"
          },
          rose: {
            light: "#FFF1F2",
            border: "#FECDD3",
            main: "#F43F5E",
            text: "#BE123C"
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.07)',
        'soft-glow': '0 0 25px -5px rgba(139, 92, 246, 0.15)',
      }
    },
  },
  plugins: [],
}
