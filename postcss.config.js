// postcss.config.js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    'postcss-preset-env': {
      stage: 2,
      features: {
        'lab-function': true, // Transpiles lab(), lch(), oklab(), and oklch() down to standard CSS strings
      },
    },
  },
};