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
        // Pan flute brand colors - can be customized later
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
    },
  },
  plugins: [],
};

export default config;
