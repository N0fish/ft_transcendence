const colors = require('tailwindcss/colors')
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{ts,tsx,js,jsx}",
        "./src/pages/**/*.{js,ts,jsx,tsx}",
        "./src/components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    700: '#422B73'
                },
                secondary: "#3364DA",
                light: '#F0F0F0',
                accent: {
                    700: '#FB5A4A'
                },
            },
        }
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
};