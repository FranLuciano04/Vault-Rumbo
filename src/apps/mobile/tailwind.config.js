/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Mismos tokens que la web (src/apps/web/src/estilos/tokens.css).
      colors: {
        primary: { DEFAULT: "#22506f", foreground: "#ffffff" },
        secondary: { DEFAULT: "#e6eff5", foreground: "#22506f" },
        accent: { DEFAULT: "#e6eff5", foreground: "#22506f" },
        border: "#d9d9d9",
        input: "#d9d9d9",
        ring: "#73a5c4",
      },
      fontFamily: { sans: ["Plus Jakarta Sans", "System"] },
    },
  },
  plugins: [],
};
