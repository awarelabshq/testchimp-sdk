const path = require('path');

/**
 * SWC plugin: source-mapper
 * Injects data-filepath and data-component into JSX components (not HTML tags)
 * Usage: Register as a custom SWC transform in your build tool (e.g., Turbopack)
 */
console.log("SWC plugin loaded")

function getTagName(node) {
  if (!node || !node.name) return '';
  if (node.name.type === 'Identifier') {
    return node.name.value;
  }
  // Handle <Foo.Bar />
  if (node.name.type === 'JSXMemberExpression') {
    let curr = node.name;
    while (curr.object) {
      curr = curr.object;
    }
    return curr.value || '';
  }
  return '';
}

function hasAttr(attrs, name) {
  return attrs.some(
    (attr) =>
      attr.type === 'JSXAttribute' &&
      attr.name && attr.name.type === 'Identifier' &&
      attr.name.value === name
  );
}

module.exports = function sourceMapperPlugin() {
  return {
    name: 'swc-plugin-source-mapper',
    visitor: {
      JSXOpeningElement(node, context) {
        const filename = context.filename;
        if (!filename || filename.includes('node_modules')) return node;

        const tagName = getTagName(node);
        if (!tagName || /^[a-z]/.test(tagName)) return node; // Skip HTML tags

        // Compute relative path
        const relativePath = path.relative(process.cwd(), filename);
        const filePathValue = relativePath.startsWith('..') ? filename : relativePath;

        // Inject data-filepath
        if (!hasAttr(node.attributes, 'data-filepath')) {
          node.attributes.push({
            type: 'JSXAttribute',
            name: { type: 'Identifier', value: 'data-filepath' },
            value: { type: 'StringLiteral', value: filePathValue },
          });
        }
        // Inject data-component
        if (!hasAttr(node.attributes, 'data-component')) {
          node.attributes.push({
            type: 'JSXAttribute',
            name: { type: 'Identifier', value: 'data-component' },
            value: { type: 'StringLiteral', value: tagName },
          });
        }
        return node;
      },
    },
  };
}; 