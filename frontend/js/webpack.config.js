const path = require('path');

module.exports = {
  mode: 'production',
  entry: './index.mjs',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'testchimp-sdk.js',
    library: {
      name: 'TestChimpSDK',
      type: 'umd',
    },
    globalObject: 'this',
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
};