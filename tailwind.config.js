module.exports = {
  content: ['./src/front-end/*.ejs', './src/front-end/**/*.ejs'],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {}
  },
  variants: {
    extend: {
      opacity: ['disabled']
    }
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
};
