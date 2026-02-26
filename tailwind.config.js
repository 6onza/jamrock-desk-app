/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Jamrock brand palette — matches web admin panel
        primary: {
          50: "#eff8ff",
          100: "#dbeefe",
          200: "#bfe0fe",
          300: "#93ccfd",
          400: "#4eaef8",
          500: "#1ea7fd", // Main brand blue (web admin)
          600: "#0b85d9",
          700: "#0a6ab0",
          800: "#0d5991",
          900: "#114b78",
          950: "#0b2f4f",
        },
        accent: {
          50: "#f5f2ff",
          100: "#ede8ff",
          200: "#ddd4ff",
          300: "#c4b1ff",
          400: "#a78bfe",
          500: "#5f28cd", // Purple accent (web admin)
          600: "#5220b0",
          700: "#431994",
          800: "#38177b",
          900: "#2e1365",
          950: "#1b0a42",
        },
        surface: {
          50: "#f5f5f5",
          100: "#e5e5e5",
          200: "#cccccc",
          300: "#b3b3b3",
          400: "#888888",
          500: "#6b6b6b",
          600: "#4a4a4a",
          700: "#383838",
          800: "#2a2a2a", // Card bg (web --black-color-3)
          850: "#222222", // Sidebar bg (web --black-color-2)
          900: "#1a1a1a", // Main bg (web --black-color)
          950: "#111111",
        },
        brand: {
          green: "#259200", // Original Jamrock green
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "0.9rem" }],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in": "slideIn 0.2s ease-out",
        "spin-slow": "spin 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
