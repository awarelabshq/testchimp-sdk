const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './index.mjs',
  devtool: 'source-map',
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
            presets: [
              ['@babel/preset-env', {
                useBuiltIns: 'usage',
                corejs: 3,
                targets: '> 0.25%, not dead',
              }],
            ],
            plugins: ['@babel/plugin-transform-runtime'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'testchimp-js.d.ts', to: 'testchimp-js.d.ts' },
      ],
    })
  ],
  optimization: {
    minimizer: [
    '...',
      new TerserPlugin({
        terserOptions: {
          ecma: 5,
          compress: true,
          output: { comments: false, beautify: false },
        },
      }),
    ],
  },
  target: ['web', 'es5'],
};