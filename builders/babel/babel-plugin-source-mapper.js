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

        // Skip built-in HTML tags (e.g. div, span)
        const tagName = node.name?.name || '';
        if (!tagName || /^[a-z]/.test(tagName)) return;

        const alreadyInstrumented = (attrName) =>
          node.attributes.some(
            (attr) =>
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name, { name: attrName })
          );

        // Relative file path
        const relativePath = path.relative(process.cwd(), filename);
        const filePathValue = relativePath.startsWith('..') ? filename : relativePath;

        if (!alreadyInstrumented('__data-filepath')) {
          node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('__data-filepath'),
              t.stringLiteral(filePathValue)
            )
          );
        }

        if (!alreadyInstrumented('__data-filepath')) {
          node.attributes.push(
            t.jsxAttribute(
              t.jsxIdentifier('__data-filepath'),
              t.stringLiteral(tagName)
            )
          );
        }
      },
    },
  };
};