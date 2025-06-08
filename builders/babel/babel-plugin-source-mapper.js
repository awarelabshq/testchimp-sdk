// babel-plugin-source-mapper.js
const path = require('path');

module.exports = function ({ types: t }) {
  return {
    name: 'source-mapper',
    visitor: {
      JSXOpeningElement(pathNode, state) {
        const { node } = pathNode;
        const { filename } = state.file.opts;

        if (!filename || filename.includes('node_modules')) return;

        // Get the tag/component name
        const tagName = node.name?.name || '';
        if (!tagName || /^[a-z]/.test(tagName)) return; // Skip HTML tags

        const alreadyInstrumented = (attrName) =>
          node.attributes.some(
            (attr) =>
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name, { name: attrName })
          );

        // Compute relative path
        const relativePath = path.relative(process.cwd(), filename);
        const filePathValue = relativePath.startsWith('..') ? filename : relativePath;

        // Inject data-filepath
        if (!alreadyInstrumented('data-filepath')) {
          node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('data-filepath'),
              t.stringLiteral(filePathValue)
            )
          );
        }

        // Inject data-component
        if (!alreadyInstrumented('data-component')) {
          node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('data-component'),
              t.stringLiteral(tagName)
            )
          );
        }
      },
    },
  };
};