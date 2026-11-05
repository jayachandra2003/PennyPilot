/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ledger: {
          bg: "#F7F5F0",            // Warm off-white primary canvas
          surface: "#FFFFFF",       // Clean card surface
          surfaceSubtle: "#FAF9F6", // Muted surface
          border: "#E6E2D8",        // 1px hairline border
          borderSubtle: "#F0EDE6",
          ink: "#14161A",           // Deep legible ink text
          inkMuted: "#575D65",      // Secondary text
          inkSubtle: "#8C929B",     // Dimmed/placeholder text
          teal: "#0F766E",          // Deep green-teal brand accent
          tealHover: "#0D655E",
          tealLight: "#E6F4F1",
          amber: "#D97706",         // Caution / budget warning
          amberLight: "#FEF3C7",
          red: "#BE123C",           // Overspend / budget alert
          redLight: "#FFE4E6",
          sage: "#059669",          // Positive savings / income
          sageLight: "#ECFDF5",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Newsreader", "Fraunces", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      boxShadow: {
        hairline: "0 1px 2px 0 rgba(20, 22, 26, 0.04)",
        card: "0 1px 3px 0 rgba(20, 22, 26, 0.06), 0 1px 2px -1px rgba(20, 22, 26, 0.04)",
        float: "0 10px 25px -5px rgba(20, 22, 26, 0.08), 0 8px 10px -6px rgba(20, 22, 26, 0.04)",
      },
    },
  },
  plugins: [],
}
