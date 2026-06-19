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
        brand: {
          DEFAULT: "#0B3D91",
          deep: "#0A2C6B",
          900: "#0A2C6B",
          800: "#0B3D91",
          700: "#0D52B4",
          600: "#0A5CAB",
          500: "#0A6FCB",
        },
        quiz: {
          DEFAULT: "#0A5CAB",
          blue: "#0A5CAB",
          dark: "#006FBF",
          action: "#006FBF",
        },
        ink: {
          DEFAULT: "#1F2933",
          soft: "#3E4C59",
          light: "#7B8794",
        },
        surface: {
          DEFAULT: "#FAFBFC",
          panel: "#F1F4F8",
          border: "#DBE1E7",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
