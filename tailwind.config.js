/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        buy: "#16a34a",
        wait: "#ca8a04",
        exit: "#dc2626",
        nodata: "#6b7280",
      },
    },
  },
  plugins: [],
};
