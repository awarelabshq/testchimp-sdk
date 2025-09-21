const path = require('path');

module.exports = {
  mode: 'production',
  entry: 'rrweb', // Entry point for rrweb
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'rrweb.js',
    library: {
      name: 'rrweb', // Expose rrweb globally
      type: 'umd',
    },
    globalObject: 'this',
  },
  // Add any necessary loaders if rrweb has specific requirements
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
