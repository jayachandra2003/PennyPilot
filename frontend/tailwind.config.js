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
          bg: "#F8FAFC",            // Modern soft neutral-gray page background (Slate-50)
          surface: "#FFFFFF",       // Crisp pure white content surfaces
          surfaceSubtle: "#F1F5F9", // Slate-100 subtle background for controls & table headers
          surfaceHover: "#F8FAFC",  // Subtle hover state
          border: "#E2E8F0",        // Slate-200 1px hairline structural border
          borderSubtle: "#F1F5F9",  // Slate-100 secondary inner dividers
          borderDark: "#CBD5E1",    // Slate-300 active/focused border
          ink: "#0F172A",           // Slate-900 high-contrast modern typography
          inkMuted: "#475569",      // Slate-600 secondary text & labels
          inkSubtle: "#64748B",     // Slate-500 timestamps & metadata
          inkFaint: "#94A3B8",      // Slate-400 disabled controls & placeholders
          teal: "#0F766E",          // Deep emerald-teal brand accent
          tealHover: "#115E59",     // Primary button hover state
          tealLight: "#F0FDFA",     // Mint/teal badge wash
          amber: "#D97706",         // Restrained amber warning
          amberLight: "#FFFBEB",
          red: "#E11D48",           // Restrained rose alert
          redLight: "#FFF1F2",
          sage: "#16A34A",          // Restrained green income / positive
          sageLight: "#F0FDF4",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"], // Sleek modern fintech typography
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",   // Micro-tags, category badges, inline pills
        md: "8px",        // Inputs, buttons, dropdown selects
        lg: "12px",       // Cards, panels, tables, containers
        xl: "16px",       // Modals, slide-overs
        "2xl": "20px",
      },
      boxShadow: {
        hairline: "0 1px 2px 0 rgba(15, 23, 42, 0.03)",
        subtle: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.03)",
        float: "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
        modal: "0 20px 35px -5px rgba(15, 23, 42, 0.12), 0 10px 15px -5px rgba(15, 23, 42, 0.06)",
      },
      maxWidth: {
        ledger: "1240px",
      },
    },
  },
  plugins: [],
}
