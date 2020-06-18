const _ = require('lodash');
const fs = require('fs');
const ShopifyTheme = require('./theme');

const args = process.argv.slice(2);
const pathToTheme = args[0];
const resultPath = 'files/analyzeThemeResult.txt';

if (_.isEmpty(pathToTheme)) {
	console.log('Example usage: npm run analyzeTheme <path/to/theme>');
	process.exit(1);
}

const theme = new ShopifyTheme(pathToTheme);
theme.checkIncludesAndSections();
theme.checkAssetFiles();
let resultText = '';

const print = (title, items) => {
	if (!_.isEmpty(items)) {
		resultText += `${title} (${items.length}):\n`;
		resultText += items.join('\n');
		resultText += '\n\n\n';
	}
};

resultText += 'File statistic:\n';
resultText += JSON.stringify(theme.themeStats, null, 2);
resultText += '\n\n';
resultText += 'Assets statistic:\n';
resultText += `js: ${theme.assets.js.length}\n`;
resultText += `css: ${theme.assets.css.length}\n`;
resultText += `other: ${theme.assets.other.length}\n`;
resultText += '\n\n\n';

resultText += '==================================================\n';
resultText += '     Unused Files\n';
resultText += '==================================================\n';
resultText += '\n\n\n';

print('Snippet render from variables or non existent file', theme.includesNotFile);
print('Sections includes with variables', theme.sectionsNotFile);
print('Snippets not rendered', theme.snippets.unused);
print('Sections not rendered and not for homepage (no preset in schema)', theme.sections.unused);
print('Asset call with variable or non existent file', theme.assets.tags.unused);
print('JS files not called with `asset_url` or `cdn.shopify.com`', theme.assets.unused.js);
print('CSS files not called with `asset_url` or `cdn.shopify.com`', theme.assets.unused.css);
print('Other asset files not called with `asset_url` or `cdn.shopify.com`', theme.assets.unused.other);

resultText += '==================================================\n';
resultText += '     Used Files\n';
resultText += '==================================================\n';
resultText += '\n\n\n';

// print('Snippets rendered', theme.snippets.used);
// print('Sections rendered', theme.sections.used);
// print('Sections with preset', theme.sections.preset);
print('JS files used', theme.assets.used.js);
print('CSS files used', theme.assets.used.css);
print('Other asset files used', theme.assets.used.other);

fs.writeFileSync(resultPath, resultText);
console.log('Done, result in:', resultPath);
