const _ = require('lodash');
const fs = require('fs');
const ShopifyTheme = require('./theme');

const args = process.argv.slice(2);
const pathToTheme = args[0];
const folderToCompile = args[1];
const fileToCompile = args[2];
const compilePath = 'files/compileResult.liquid';

if (_.isEmpty(pathToTheme) || _.isEmpty(folderToCompile) || _.isEmpty(fileToCompile)) {
	console.log('Example usage: npm run analyzeThemeFile <path/to/theme> <folder> <filenameToCompile>');
	process.exit(1);
}

const theme = new ShopifyTheme(pathToTheme);
const {
	compileResult, totalFor, maxFor, minFor,
} = theme.analyzeFile(folderToCompile, fileToCompile);

fs.writeFileSync(compilePath, compileResult);
console.log('Done, compile result in:', compilePath);
console.log('Total for loop:', totalFor);
console.log('Max for loop:', maxFor);
console.log('Min for loop:', minFor);
