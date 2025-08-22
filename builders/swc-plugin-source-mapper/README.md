# swc-plugin-source-mapper

A SWC-compatible plugin that injects `data-filepath` and `data-component` attributes into JSX component elements (not HTML tags). This is useful for debugging, testing, and tooling that needs to know the source file and component name at runtime.

## What it does
- Adds `data-filepath` (relative to project root) and `data-component` (component name) to JSX components.
- Skips HTML tags and files in `node_modules`.

## Usage

1. **Install dependencies** (if not already present in your project):
   ```sh
   npm install @swc/core
   ```

2. **Add this plugin to your SWC or Turbopack config:**
   - If using Turbopack, reference the plugin via a relative path or npm package.
   - Example (in your SWC config):
     ```js
     // swc.config.js
     module.exports = {
       jsc: {
         transform: {
           react: { runtime: 'automatic' },
         },
       },
       plugin: [
         require.resolve('../builders/swc-plugin-source-mapper/index.js'),
       ],
     };
     ```

3. **How it works:**
   - For every JSX component (e.g., `<MyComponent />`), the plugin adds:
     ```jsx
     <MyComponent data-filepath="src/components/MyComponent.jsx" data-component="MyComponent" />
     ```

## Notes
- This plugin is written in CommonJS for maximum compatibility.
- If you publish to npm, update the `main` field in `package.json` if you rename `index.js`.
- For advanced usage or issues, see SWC and Turbopack documentation. 