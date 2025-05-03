const fs = require('fs');
const path = require('path');

class Utf8BOMPlugin {
  constructor(options = {}) {
    this.dir = options.dir || 'dist';
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tap('Utf8BOMPlugin', (compilation) => {
      const distPath = path.resolve(compiler.options.output.path);
      const files = fs.readdirSync(distPath);

      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(distPath, file);
          const content = fs.readFileSync(filePath);
          if (!content.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
            fs.writeFileSync(filePath, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), content]));
            console.log(`UTF-8 BOM added: ${file}`);
          }
        }
      }
    });
  }
}

module.exports = Utf8BOMPlugin;