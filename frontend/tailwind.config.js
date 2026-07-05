/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#F97316",
          light: "#FB923C",
          dark: "#C2410C",
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          300: "#FDBA74",
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
          800: "#9A3412",
          900: "#7C2D12",
        },
        accent: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          dark: "#D97706",
        },
        dark: {
          bg: "#0F172A",
          card: "#1E293B",
          border: "#334155",
          text: "#F8FAFC",
          muted: "#94A3B8",
        },
        light: {
          bg: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          text: "#0F172A",
          muted: "#64748B",
        },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      fontSize: {
        /* Design system type scale (6 levels) */
        display: ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["2rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.01em", fontWeight: "600" }],
        h3: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1.4", fontWeight: "500", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        /* 3 elevation levels */
        "elevation-1": "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        "elevation-2": "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 6px -2px rgb(15 23 42 / 0.06)",
        "elevation-3": "0 12px 32px -4px rgb(15 23 42 / 0.12), 0 4px 12px -4px rgb(15 23 42 / 0.08)",
      },
      spacing: {
        /* 8-point grid section spacing */
        section: "4rem",
        "section-sm": "2.5rem",
      },
      maxWidth: {
        container: "80rem",
      },
    },
  },
  plugins: [],
};
