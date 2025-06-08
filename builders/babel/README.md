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

### With `craco.config.js` or Babel config:

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

### Output

Each JSX element will get:

`<Component data-filepath="src/components/MyComponent.jsx" data-component="Component" />`

Notes
	•	Only applies to custom React components (not HTML tags)
	•	Skips node_modules
	•	Works best with NODE_ENV=development and minification turned off