/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1a1a1a",
        paper: "#f6f3ee",
        accent: "#b8482e",
        muted: "#7a7268",
        line: "#d8d2c5",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "PingFang SC", "Helvetica", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
