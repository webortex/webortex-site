/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      "2xs": { max: "424px" },
      xs: { min: "425px" },
      sm: { min: "640px" },
      md: { min: "768px" },
      lg: { min: "1024px" },
      xl: { min: "1280px" },
      "2xl": { min: "1536px" },
      "3xl": { min: "1936px" },
    },
    fontFamily: {
      outlet: ["Outfit Variable", "regular"],
    },
    extend: {
      colors: {
        backgroundColor: "#060606",
        // headColor: "bg-gradient-to-r from-[#efefef] to-[#898989]",
        textColor: "#efefef",
        secondaryTextColor: "#a0a0a0",
        logoGreenColor: "#62ba47",
        logoBlueColor: "#009dda",
        buttonBgColor: "#62ba47",
        buttonTextColor: "#060606",
        navlinkColor: "#ffffff",
        navlinkHoverColor: "#bcd195",
        viewProfileBtnBgColor: "#3b3b3b",
        coverMainTextColor: "#c5c5c5",
        brandsBgColor: "#222222",
      },
    },
  },
  plugins: [],
  important: "#root",
};
