const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = [
    // UMD build (for browsers and Node.js)
    {
        mode: 'production',
        entry: './index.mjs',
        devtool: 'source-map',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'testchimp-sdk.umd.js',
            library: {
                name: 'TestChimpSDK',
                type: 'umd',
                export: 'default',
            },
            globalObject: 'this', // Ensures compatibility in both browser and Node.js
        },
        module: {
            rules: [{
                test: /\.(mjs|js|ts)$/,  // Match .mjs, .js, and .ts files
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-typescript',
                            ['@babel/preset-env', {
                                useBuiltIns: 'usage',
                                corejs: 3,
                                targets: '> 0.25%, not dead, IE 11', // Broad compatibility, including IE 11
                            }],
                        ],
                        plugins: ['@babel/plugin-transform-runtime'],
                    },
                },
            },],
        },
        resolve: {
            extensions: ['.ts', '.js', '.json'],
        },
        optimization: {
            minimizer: [
                '...',
                new TerserPlugin({
                    terserOptions: {
                        ecma: 5,
                        compress: true,
                        output: {
                            comments: false,
                            beautify: false
                        },
                    },
                }),
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify('production'),
            }),
        ],
        target: ['web', 'es5'], // Ensures ES5 compatibility
    },

    // ESM build (for modern JavaScript applications)
    {
        mode: 'production',
        entry: './index.mjs',
        devtool: 'source-map',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'testchimp-sdk.esm.js',
            library: {
                type: 'module',
            },
            globalObject: 'this',
        },
        experiments: {
            outputModule: true, // Required for ESM output
        },
        module: {
            rules: [{
                test: /\.[cm]?[jt]s$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-typescript',
                            ['@babel/preset-env', {
                                useBuiltIns: 'usage',
                                corejs: 3,
                                targets: '> 0.25%, not dead',
                            }],
                        ],
                        plugins: ['@babel/plugin-transform-runtime'],
                    },
                },
            },],
        },
        resolve: {
            extensions: ['.ts', '.js', '.json'],
        },
        optimization: {
            minimizer: [
                '...',
                new TerserPlugin({
                    terserOptions: {
                        ecma: 6,
                        compress: true,
                        output: {
                            comments: false,
                            beautify: false
                        },
                    },
                }),
            ],
        },
        target: ['web', 'es6'], // Modern JavaScript (ES6+)
    },

    // CommonJS build (for Node.js and CommonJS environments)
    {
        mode: 'production',
        entry: './index.mjs',
        devtool: 'source-map',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: 'testchimp-sdk.cjs.js',
            library: {
                type: 'commonjs2',
            },
            globalObject: 'this',
        },
        module: {
            rules: [{
                test: /\.(mjs|js|ts)$/,  // Match .mjs, .js, and .ts files
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-typescript',
                            ['@babel/preset-env', {
                                useBuiltIns: 'usage',
                                corejs: 3,
                                targets: '> 0.25%, not dead',
                            }],
                        ],
                        plugins: ['@babel/plugin-transform-runtime'],
                    },
                },
            },],
        },
        resolve: {
            extensions: ['.js', '.json'],
        },
        optimization: {
            minimizer: [
                '...',
                new TerserPlugin({
                    terserOptions: {
                        ecma: 5,
                        compress: true,
                        output: {
                            comments: false,
                            beautify: false
                        },
                    },
                }),
            ],
        },
        target: ['node', 'es5'], // ES5 for Node.js
    },
];