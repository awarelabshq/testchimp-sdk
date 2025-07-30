# babel-plugin-source-mapper

A Babel plugin to inject `data-filepath` and `data-component` attributes into React JSX elements.

## Why?

This is useful for:

- Mapping DOM elements back to their source files
- Building screen-to-source tools
- Enabling AI agents to reason about code ownership
- This is built by TestChimp primarily for mapping the source files related to screens of webapps during exploratory testing

## Usage

### Install

`npm install –save-dev babel-plugin-source-mapper`

Notes
	•	Only applies to custom React components (not HTML tags)
	•	Skips node_modules
	•	Works best with NODE_ENV=development and minification turned off

Exact steps for integration with the build process depends on the specific setup

Below are the instructions for 2 common setups

### With Craco:

```js
const sourceMapper = require('babel-plugin-source-mapper');

module.exports = {
  babel: {
    plugins: [sourceMapper],
  },
  webpack: {
    configure: (config) => {
      config.optimization.minimize = false;
      return config;
    },
  },
};
```

### With Next JS

Simply paste the following to a babel.config.js file:
```
module.exports = {
  presets: ["next/babel"],
  plugins: [
    "babel-plugin-source-mapper"
  ],
};
```

Since next js by default uses webpack + babel, your build will pick up the custom plugin, and instrument your build with the source information.

Caveat: Babel does not work with Turbopack, so if you are using turbopack (which is usually only used in dev environments), you will need to disable it like so:

```
 /** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: false, // disables Turbopack (re-enables Webpack + Babel)
  },
};

module.exports = nextConfig;
```

### Output

Each JSX element will get:

`<Component data-filepath="src/components/MyComponent.jsx" data-component="Component" />`

