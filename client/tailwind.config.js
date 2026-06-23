/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: "#8b5cf6", // violet — our brand accent (light, attractive purple)
        secondary: "#c084fc", // lighter purple for gradients
        accent: "#a855f7",
        ink: "#0a0a12",
        surface: "#15151f",
        elevated: "#1d1d2a",
        edge: "#2c2c3c",
      },
      boxShadow: {
        card: "0 10px 30px -10px rgba(0,0,0,0.7)",
        glow: "0 0 0 2px rgba(139,92,246,0.7), 0 18px 40px -12px rgba(0,0,0,0.85)",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        riseIn: { "0%": { opacity: 0, transform: "translateY(16px)" }, "100%": { opacity: 1, transform: "translateY(0)" } },
        kenburns: { "0%": { transform: "scale(1.05)" }, "100%": { transform: "scale(1.15)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        fadeIn: "fadeIn .5s ease both",
        riseIn: "riseIn .6s cubic-bezier(.2,.7,.2,1) both",
        kenburns: "kenburns 18s ease-out both",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
