import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bib: {
          wit: "#ffffff",
          beige: "#fde5d0",
          beigeSoft: "#fef3e6",
          antraciet: "#39373a",
          antracietSoft: "#6a6870",
          oranje: "#ec7404",
          line: "#e5ddd1",
          vaag: "#c64a2e",
          levendig: "#3f8a5a",
        },
      },
      fontFamily: {
        kop: ['"The Mix"', '"TheMixOT"', "Georgia", "serif"],
        tekst: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
