/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#F97316", light: "#FB923C", dark: "#C2410C", 50: "#FFF7ED", 100: "#FFEDD5", 200: "#FED7AA", 300: "#FDBA74", 400: "#FB923C", 500: "#F97316", 600: "#EA580C", 700: "#C2410C", 800: "#9A3412", 900: "#7C2D12" },
        accent: { DEFAULT: "#F59E0B", light: "#FBBF24", dark: "#D97706", 50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D", 400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309", 800: "#92400E", 900: "#78350F" },
        dark: { bg: "#020817", card: "#0F172A", border: "#1E293B", text: "#F8FAFC", muted: "#94A3B8" },
        light: { bg: "#FFFFFF", card: "#F8FAFC", border: "#E2E8F0", text: "#0F172A", muted: "#64748B" },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        // Accessible link/label color (~4.5:1 on white) — use instead of #F97316 for text.
        link: "#C2410C"
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif']
      },
      borderRadius: { xl: "12px", "2xl": "16px", btn: "12px", card: "16px" },
      boxShadow: {
        card: "0 1px 3px 0 rgba(15,23,42,0.08)",
        "card-hover": "0 10px 30px -10px rgba(15,23,42,0.15)",
        modal: "0 24px 60px -12px rgba(15,23,42,0.30)"
      }
    }
  },
  plugins: []
};
