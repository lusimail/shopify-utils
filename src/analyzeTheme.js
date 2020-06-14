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
let resultText = '';
resultText += 'File statistic:\n';
resultText += JSON.stringify(theme.themeStats, null, 2);
resultText += '\n\n';
resultText += 'Assets statistic:\n';
resultText += `js: ${theme.assets.js.length}\n`;
resultText += `css: ${theme.assets.css.length}\n`;
resultText += `other: ${theme.assets.other.length}\n`;
resultText += '\n\n\n';

if (!_.isEmpty(theme.includesNotFile)) {
	resultText += 'Snippet render from variables or with non existent file:\n';
	resultText += theme.includesNotFile.join('\n');
	resultText += '\n\n\n';
}

if (!_.isEmpty(theme.sectionsNotFile)) {
	resultText += 'Sections includes with variables:\n';
	resultText += theme.sectionsNotFile.join('\n');
	resultText += '\n\n\n';
}

resultText += 'Snippets not rendered:\n';
resultText += theme.snippets.unused.join('\n');
resultText += '\n\n\n';

resultText += 'Sections not rendered and not for homepage (no preset in schema):\n';
resultText += theme.sections.unused.join('\n');
resultText += '\n\n\n';

fs.writeFileSync(resultPath, resultText);
console.log('Done, result in:', resultPath);
