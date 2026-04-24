/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#FF6B00", light: "#FF8C42", dark: "#E55A00", 50: "#FFF3E6", 100: "#FFE0CC", 200: "#FFC299", 300: "#FFA366", 400: "#FF8533", 500: "#FF6B00", 600: "#E55A00", 700: "#CC4F00", 800: "#994000", 900: "#663000" },
        dark: { bg: "#0F0F0F", card: "#1A1A1A", border: "#2A2A2A", text: "#F5F5F5", muted: "#666666" },
        light: { bg: "#FFFFFF", card: "#F9F9F9", border: "#E5E5E5", text: "#1A1A1A", muted: "#666666" },
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444"
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: { xl: "12px", "2xl": "16px" }
    }
  },
  plugins: []
};
