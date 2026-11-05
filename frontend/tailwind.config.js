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
          bg: "#F7F5F0",            // Warm off-white archival canvas
          surface: "#FFFFFF",       // Pure white card surface
          surfaceSubtle: "#FAF9F6", // Muted stone surface for table headers & inputs
          surfaceHover: "#F5F3ED",  // Hover state for interactive rows & secondary buttons
          border: "#E5E0D8",        // Primary 1px hairline structural border
          borderSubtle: "#EFECE6",  // Subtle secondary inner divider
          borderDark: "#D5CFC3",    // Active / focused hairline border
          ink: "#121417",           // Deep legible ink text (14.2:1 contrast against bg)
          inkMuted: "#4A515A",      // Secondary text, labels, notes (7.1:1 contrast)
          inkSubtle: "#7D848F",     // Timestamps, column headers, metadata (4.6:1 contrast)
          inkFaint: "#A4ABB5",      // Disabled text & input placeholders
          teal: "#0F766E",          // Deep forest-teal brand accent
          tealHover: "#0D635C",     // Button hover state
          tealLight: "#EAF4F2",     // Micro-badge background tint
          amber: "#B45309",         // Restrained caution / budget warning
          amberLight: "#FEF3C7",
          red: "#BE123C",           // Restrained overspend / alert tone
          redLight: "#FEE2E2",
          sage: "#047857",          // Positive savings / income tone
          sageLight: "#E8F5EE",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Newsreader", "Fraunces", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",   // Micro-tags, category badges, inline pills
        md: "6px",        // Inputs, buttons, dropdown selects
        lg: "8px",        // Cards, panels, tables, containers
        xl: "12px",       // Modals, slide-overs
        "2xl": "16px",
      },
      boxShadow: {
        hairline: "0 1px 2px 0 rgba(18, 20, 23, 0.03)",
        subtle: "0 1px 2px 0 rgba(18, 20, 23, 0.04)",
        card: "0 1px 2px 0 rgba(18, 20, 23, 0.04)",
        float: "0 8px 24px -4px rgba(18, 20, 23, 0.08), 0 2px 6px -1px rgba(18, 20, 23, 0.04)",
        modal: "0 12px 32px -4px rgba(18, 20, 23, 0.12), 0 4px 12px -2px rgba(18, 20, 23, 0.06)",
      },
      maxWidth: {
        ledger: "1240px",
      },
    },
  },
  plugins: [],
}
