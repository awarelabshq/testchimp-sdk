const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
//const Utf8BOMPlugin = require('./Utf8BOMPlugin');

module.exports = {
  mode: 'production',
  entry: {
    background: ['./background.js', './background-websockets.js'],
    index: './index-ext.mjs',   // Your background script (if this is still correct)
    sidebar: './sidebar.tsx',         // Update to point to the correct .tsx file
    injectSidebar: './injectSidebar.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',  // Dynamically use entry name (background.js, sidebar.js)
    library: {
      name: 'TestChimpSDK',
      type: 'umd',
    },
    globalObject: 'this',
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx|mjs)$/,  // This will match .tsx, .ts, .js, and .jsx files
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript', // Ensure TypeScript is handled
            ],
          },
        },
      },
      {
        test: /\.css$/i,
        use: 'raw-loader',
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],  // Ensure webpack resolves .tsx files
  },
  optimization: {
    minimize: false, // Disable minification
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },  // Ensure manifest is copied
        { from: 'menu-config.json', to: 'menu-config.json' },  // Ensure manifest is copied
        { from: 'popup.html', to: 'popup.html' },
        { from: 'options.html', to: 'options.html' },
        { from: 'options.js', to: 'options.js' },
        { from: 'contextMenu.js', to: 'contextMenu.js' },
        { from: 'injectScript.js', to: 'injectScript.js' },
        { from: 'localRun.js', to: 'localRun.js' },
        { from: 'background-websockets.js', to: 'background-websockets.js' },
        { from: 'images/', to: 'images/' },
      ],
    }),
    //new Utf8BOMPlugin({ dir: 'dist' }), // Add this
  ],
};