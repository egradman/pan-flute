import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Keep bamboo for flute-specific elements (3D preview, instrument accents)
        bamboo: {
          50: "#faf6f1",
          100: "#f0e6d6",
          200: "#e0ccad",
          300: "#ccab7d",
          400: "#bb8e56",
          500: "#ad7a3f",
          600: "#956334",
          700: "#7a4d2d",
          800: "#654029",
          900: "#543625",
        },
      },
      fontFamily: {
        display: ["var(--font-fredoka)", "system-ui", "sans-serif"],
        body: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out both",
        "scale-in": "scale-in 0.5s ease-out both",
        "slide-in-left": "slide-in-left 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
