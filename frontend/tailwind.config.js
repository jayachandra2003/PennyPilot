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
          bg: "#FAF8F5",            // Refined warm off-white canvas
          surface: "#FFFFFF",       // Pure white content surfaces
          surfaceSubtle: "#F5F2EA", // Subtle warm stone background for table headers & controls
          surfaceHover: "#F7F5EE",  // Interactive hover state
          border: "#E8E4DC",        // Crisp 1px hairline structural border
          borderSubtle: "#F0ECE4",  // Secondary inner hairline dividers
          borderDark: "#D6D0C4",    // Active/focused hairline border
          ink: "#12161A",           // Deep charcoal/navy high-contrast typography
          inkMuted: "#4E5661",      // Slate-charcoal secondary text & labels
          inkSubtle: "#767E8A",     // Metadata, timestamps, column headers
          inkFaint: "#9DA5B0",      // Disabled controls & placeholders
          teal: "#0F766E",          // Deep forest-teal brand accent
          tealHover: "#0D635C",     // Button hover state
          tealLight: "#EBF5F3",     // Subtle teal highlight wash
          amber: "#B45309",         // Restrained warm amber warning
          amberLight: "#FEF3C7",
          red: "#BE123C",           // Restrained crimson alert
          redLight: "#FFF1F2",
          sage: "#047857",          // Positive income & savings tone
          sageLight: "#ECFDF5",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Newsreader", "Fraunces", "Georgia", "serif"], // Editorial serif typography
        mono: ["JetBrains Mono", "Courier New", "monospace"],  // Tabular financial figures
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        md: "7px",
        lg: "10px",        // Cards, panels, tables (avoiding generic puffy pills)
        xl: "14px",        // Modals & slide-overs
        "2xl": "18px",
      },
      boxShadow: {
        hairline: "0 1px 2px 0 rgba(18, 22, 26, 0.03)",
        subtle: "0 1px 2px 0 rgba(18, 22, 26, 0.04)",
        card: "0 1px 3px 0 rgba(18, 22, 26, 0.04), 0 1px 2px -1px rgba(18, 22, 26, 0.02)",
        float: "0 10px 25px -5px rgba(18, 22, 26, 0.08), 0 8px 10px -6px rgba(18, 22, 26, 0.03)",
        modal: "0 20px 35px -5px rgba(18, 22, 26, 0.12), 0 10px 15px -5px rgba(18, 22, 26, 0.05)",
      },
      maxWidth: {
        ledger: "1240px",
      },
    },
  },
  plugins: [],
}
