import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#06131f",
        mist: "#d8e5ec",
        ocean: "#0f766e",
        sunrise: "#f59e0b",
        neon: "#22c55e",
        danger: "#f43f5e"
      },
      fontFamily: {
        sans: ["var(--font-sans)"]
      },
      boxShadow: {
        soft: "0 20px 60px rgba(3, 15, 28, 0.18)"
      },
      backgroundImage: {
        "dashboard-grid": "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
