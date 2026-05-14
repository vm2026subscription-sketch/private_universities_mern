/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#002147", light: "#003366", dark: "#001630", 50: "#E6EAEE", 100: "#CCD6DF", 200: "#99ADB2", 300: "#668485", 400: "#335B58", 500: "#002147", 600: "#001B3A", 700: "#001630", 800: "#001021", 900: "#000B16" },
        accent: { DEFAULT: "#C5A022", light: "#D4B44A", dark: "#A0821B", 50: "#F9F6E9", 100: "#F2EDD3", 200: "#E6DAA7", 300: "#D9C77B", 400: "#CDB44F", 500: "#C5A022", 600: "#B1901F", 700: "#9E801B", 800: "#766014", 900: "#4F400E" },
        dark: { bg: "#020817", card: "#0F172A", border: "#1E293B", text: "#F8FAFC", muted: "#94A3B8" },
        light: { bg: "#FFFFFF", card: "#F8FAFC", border: "#E2E8F0", text: "#0F172A", muted: "#64748B" },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444"
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif']
      },
      borderRadius: { xl: "12px", "2xl": "16px" }
    }
  },
  plugins: []
};
