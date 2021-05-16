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

const print = (title, items, prop = 'filename') => {
	if (!_.isEmpty(items)) {
		resultText += `${title} (${items.length}):\n`;
		resultText += (prop === false ? items : _.map(items, prop)).join('\n');
		resultText += '\n\n\n';
	}
};

resultText += 'File statistic:\n';
resultText += JSON.stringify(theme.themeStats, null, 2);
resultText += '\n\n';

resultText += '==================================================\n';
resultText += '     Unused Files\n';
resultText += '==================================================\n';
resultText += '\n\n\n';

print('Snippet render from variables', theme.snippetVars, 'content');
print('Snippet render non existent file', theme.snippetNoFile, 'content');
print('Section includes with variables', theme.sectionVars, 'content');
print('Section includes non existent file', theme.sectionNoFile, 'content');
print('Snippets not rendered', theme.getFiles({ folder: 'snippets', isRendered: false }), 'filename');
print('Snippets only used in 1 file', theme.getFiles((f) => f.folder === 'snippets' && f.isRendered && f.renderedIn.length <= 1), 'filename');
print('Sections not rendered and not for homepage (no preset in schema)', theme.getFiles({ folder: 'sections', isRendered: false, hasPreset: false }), 'filename');
print('Sections has preset but not rendered and not on homepage', theme.getFiles({
	folder: 'sections', hasPreset: true, isRendered: false, inIndex: false,
}), 'filename');
print('Unused section settings (files does not exist or disabled)', theme.themeSettings.sectionSettingsUnused, false);
print('Asset call with variable or non existent file', theme.assetNoFile, 'content');
print('Asset urls with variable or non existent file', theme.assetUrlNoFile, 'content');
print('JS files not called with `asset_url` or `cdn.shopify.com`', theme.getFiles({ folder: 'assets', assetType: 'js', isRendered: false }), 'filename');
print('CSS files not called with `asset_url` or `cdn.shopify.com`', theme.getFiles({ folder: 'assets', assetType: 'css', isRendered: false }), 'filename');
print('Other files not called with `asset_url` or `cdn.shopify.com`', theme.getFiles({ folder: 'assets', assetType: 'other', isRendered: false }), 'filename');

resultText += '==================================================\n';
resultText += '     Used Files\n';
resultText += '==================================================\n';
resultText += '\n\n\n';

print('Snippets rendered', theme.getFiles({ folder: 'snippets', isRendered: true }), 'filename');
print('Sections rendered', theme.getFiles({ folder: 'sections', isRendered: true }), 'filename');
print('Sections with preset', theme.getFiles({ folder: 'sections', hasPreset: true }), 'filename');
print('Sections with preset and active in homepage', theme.getFiles({ folder: 'sections', hasPreset: true, inIndex: true }), 'filename');
print('JS files used', theme.getFiles({ folder: 'assets', assetType: 'js', isRendered: true }), 'filename');
print('CSS files used', theme.getFiles({ folder: 'assets', assetType: 'css', isRendered: true }), 'filename');
print('Other files used', theme.getFiles({ folder: 'assets', assetType: 'other', isRendered: true }), 'filename');

fs.writeFileSync(resultPath, resultText);
console.log('Done, result in:', resultPath);
