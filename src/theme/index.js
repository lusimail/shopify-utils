const _ = require('lodash');
const fs = require('fs');
const minimatch = require('minimatch');
const LiquidFile = require('./liquid');
const { unionTags } = require('./helper');

const FOLDER_THEME = ['assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates', 'templates/customers'];
const FOLDER_TO_CHECK = ['assets', 'layout', 'sections', 'snippets', 'templates', 'templates/customers'];
const REGEXP_JS = /(.js|.js.liquid)$/g;
const REGEXP_CSS = /(.css|.css.liquid|.scss|.scss.liquid)$/g;
const REGEXP_LIQUID_TAG = /{%[^]*?%}/g;
const REGEXP_ASSET_TAG = /(?<={{|{%)[^}]*?\|\s{0,3}(asset_url|asset_img_url)(?=[^a-z_-]?.*?(}}|%}))/gi;
const REGEXP_ASSET_URL = /cdn.shopify.com\/s\/files.*?\/assets\/[^?'")\n]*/g;
const REGEXP_QUOTED = /(?<=['"`]).*?(?=['"`])/;
const REGEXP_COMMENT = /{%[\s-]{0,3}comment[^]*?endcomment[\s-]{0,3}%}/g;
const REGEXP_SCHEMA = /{%[\s-]{0,3}schema[^]*?endschema[\s-]{0,3}%}/g;
const REGEXP_SCHEMA_JSON = /(?<={%[\s-]{0,3}schema[\s-]{0,3}%})[^]*?(?={%[\s-]{0,3}endschema[\s-]{0,3}%})/g;

class ShopifyTheme {
	constructor(pathToTheme) {
		this.pathToTheme = pathToTheme;
		this.themeFiles = [];
		this.themeStats = {
			folder: {},
			assets: {},
			totalFiles: 0,
		};

		this.readThemeFiles();
		this.processFiles();
	}

	readThemeFiles() {
		_.forEach(FOLDER_THEME, (folder) => {
			let filenames;
			try {
				filenames = fs.readdirSync(`${this.pathToTheme}/${folder}`);
			} catch (error) {
				console.log(`folder ${folder} error: ${error}`);
				filenames = [];
			}
			if (folder === 'templates') _.remove(filenames, (n) => n === 'customers');

			this.themeStats.folder[folder] = filenames.length;
			this.themeStats.totalFiles += filenames.length;

			_.forEach(filenames, (filename) => {
				this.themeFiles.push(new LiquidFile(folder, filename, this.pathToTheme));
			});
		});
		this.themeStats.assets.js = this.getFileCount({ assetType: 'js' });
		this.themeStats.assets.css = this.getFileCount({ assetType: 'css' });
		this.themeStats.assets.other = this.getFileCount({ assetType: 'other' });
	}

	searchFunc(comparator) {
		if (_.isObject(comparator)) {
			return (f) => {
				let result = true;
				_.forEach(comparator, (val, key) => {
					if (_.isString(val) && _.isString(f[key])) {
						result = result && minimatch(f[key], val);
					} else result = result && f[key] === val;
				});
				return result;
			};
		}
		return comparator;
	}

	getFile(comparator) {
		return _.find(this.themeFiles, this.searchFunc(comparator));
	}

	getFiles(comparator) {
		return _.filter(this.themeFiles, this.searchFunc(comparator));
	}

	getFileCount(comparator) {
		return this.getFiles(comparator).length;
	}

	processFiles() {
		this.snippetVars = [];
		this.sectionVars = [];
		this.snippetNoFile = [];
		this.sectionNoFile = [];
		this.assetNoFile = [];
		this.assetUrlNoFile = [];
		_.forEach(this.getFiles((file) => (_.includes(FOLDER_TO_CHECK, file.folder))), (file) => {
			if (!_.isEmpty(file.snippetVars)) this.snippetVars = unionTags(this.snippetVars, file.snippetVars);
			if (!_.isEmpty(file.sectionVars)) this.sectionVars = unionTags(this.sectionVars, file.sectionVars);

			const searchFile = (tag, elseArray, compareFunc) => {
				const includeFile = this.getFile(compareFunc);
				if (includeFile) {
					includeFile.addRenderingFile(file);
					tag.file = includeFile; // eslint-disable-line
				} else {
					this[elseArray] = unionTags(this[elseArray], [tag]);
				}
			};

			_.forEach(file.snippetUsed, (tag) => {
				searchFile(tag, 'snippetNoFile', (f) => f.folder === 'snippets' && (tag.quoted === f.basename || tag.quoted === f.filename));
			});
			_.forEach(file.sectionUsed, (tag) => {
				searchFile(tag, 'sectionNoFile', (f) => f.folder === 'sections' && (tag.quoted === f.basename || tag.quoted === f.filename));
			});
			if (!_.isEmpty(file.assets)) {
				_.forEach(file.assets.tags, (tag) => {
					searchFile(tag, 'assetNoFile', (f) => f.folder === 'assets' && tag.content.match(new RegExp(`[^a-z_.-]?(${f.basename}|${f.filename})[^a-z_.-]?`)));
				});
				_.forEach(file.assets.urls, (tag) => {
					searchFile(tag, 'assetUrlNoFile', (f) => f.folder === 'assets' && tag.content.match(new RegExp(`/assets/(${f.basename}|${f.filename})$`)));
				});
			}
		});
	}

	renderFiles(...comparators) {
		const files = _.flatten(_.map(comparators, (comp) => this.getFiles(comp)));
		_.forEach(files, (file) => { file.render(); });
		const renderedSectionUsed = _.flatten(_.map(files, 'renderedSectionUsed'));
		const renderedSnippetUsed = _.flatten(_.map(files, 'renderedSnippetUsed'));
		return {
			files,
			renderedSectionUsed,
			renderedSnippetUsed,
		};
	}

	// compileFile(folder, file) {
	// 	const fileDetail = this.files[folder][file];
	// 	if (_.isEmpty(fileDetail)) { return { compiled: `<!-- file not exist: ${folder}/${file} -->` }; }
	// 	const { content } = fileDetail;
	// 	if (!_.isEmpty(fileDetail.compiled)) { return fileDetail; }
	// 	if (_.isEmpty(fileDetail.liquidTag)) { this.processLiquidFile(folder, file); }
	// 	const { liquidTag } = fileDetail;
	// 	let result = content;
	// 	let totSnippets = 0;
	// 	let totSections = 0;
	// 	_.forEach(_.filter(liquidTag, (t) => _.includes(['include', 'render', 'section'], t.type)), (t) => {
	// 		const f = t.type === 'section' ? 'sections' : 'snippets';
	// 		if (folder === 'snippets' && folder === f && file === t.filename) {
	// 			result = _.replace(result, t.tag, '<!-- loop include -->');
	// 		} else {
	// 			const { compiled, totalSnippets, totalSections } = this.compileFile(f, t.filename);
	// 			result = _.replace(result, t.tag, compiled);
	// 			totSnippets += totalSnippets || 0;
	// 			totSections += totalSections || 0;
	// 		}
	// 		if (f === 'snippets') totSnippets += 1;
	// 		if (f === 'sections') totSections += 1;
	// 	});
	// 	fileDetail.compiled = result;
	// 	fileDetail.totalSnippets = totSnippets;
	// 	fileDetail.totalSections = totSections;
	// 	return fileDetail;
	// }

	// analyzeFile(folder, file) {
	// 	const { compiled, totalSnippets, totalSections } = this.compileFile(folder, file);
	// 	const {
	// 		totalFor, forOutsideIf, maxFor, minFor,
	// 	} = this.analyzeForLoop(compiled);

	// 	return {
	// 		compiled, forOutsideIf, totalFor, maxFor, minFor, totalSnippets, totalSections,
	// 	};
	// }

	// analyzeForLoop(content) {
	// 	const liquidTag = this.getLiquidTags(content, true);
	// 	const ifTag = ['if', 'unless', 'case'];
	// 	const endIfTag = ['endif', 'endunless', 'endcase'];
	// 	const totalIf = _.filter(liquidTag, (tag) => _.includes(ifTag, tag.type)).length;
	// 	const totalEndIf = _.filter(liquidTag, (tag) => _.includes(endIfTag, tag.type)).length;
	// 	const totalFor = _.filter(liquidTag, (tag) => tag.type === 'for').length;
	// 	console.log('Analyzing for loops');
	// 	console.log('total If:', totalIf);
	// 	console.log('total EndIf:', totalEndIf);
	// 	console.log('total For:', totalFor);
	// 	if (totalIf !== totalEndIf) {
	// 		console.log('Number of if / unless / case not equal to number of endif / endunless / endcase');
	// 		console.log('Please check if your code have {% comment %} inside {% comment %}, this may cause the comment not removed correctly.');
	// 		return { totalFor, maxFor: 0, minFor: 0 };
	// 	}

	// 	let forOutsideIf = 0;
	// 	let maxFor = 0;
	// 	let minFor = 0;
	// 	const ifBlock = [];
	// 	const stack = [];
	// 	let currentIf = null;
	// 	// let level = 0;
	// 	_.forEach(liquidTag, (tag, index) => {
	// 		if (_.includes(['if', 'unless', 'case'], tag.type)) {
	// 			// console.log(`${_.padStart('', level * 2)}${tag.tag}`);
	// 			if (!_.isEmpty(currentIf)) { stack.push(currentIf); }
	// 			// level += 1;
	// 			currentIf = {
	// 				index: [index], forCount: 0, maxFor: 0, minFor: null,
	// 			};
	// 		} else if (_.includes(['elsif', 'else', 'when'], tag.type)) {
	// 			// console.log('else', currentIf);
	// 			currentIf.index.push(index);
	// 			if (currentIf.maxFor < currentIf.forCount) currentIf.maxFor = currentIf.forCount;
	// 			if (currentIf.minFor === null || currentIf.minFor > currentIf.forCount) currentIf.minFor = currentIf.forCount;
	// 			currentIf.forCount = 0;
	// 		} else if (_.includes(['endif', 'endunless', 'endcase'], tag.type)) {
	// 			// level -= 1;
	// 			// console.log(`${_.padStart('', level * 2)}${tag.tag}`);
	// 			currentIf.index.push(index);
	// 			if (currentIf.maxFor < currentIf.forCount) currentIf.maxFor = currentIf.forCount;
	// 			if (currentIf.minFor === null || currentIf.minFor > currentIf.forCount) currentIf.minFor = currentIf.forCount;
	// 			currentIf.forCount = 0;
	// 			if (!_.isEmpty(stack)) {
	// 				const parentIf = stack.pop();
	// 				parentIf.index.push(currentIf.index);
	// 				parentIf.childMaxFor = currentIf.maxFor + (currentIf.childMaxFor || 0);
	// 				parentIf.childMinFor = currentIf.minFor + (currentIf.childMinFor || 0);
	// 				currentIf = parentIf;
	// 			} else {
	// 				// console.log();
	// 				ifBlock.push(currentIf);
	// 				// console.log(liquidTag[_.first(currentIf.index)].tag);
	// 				// console.log(liquidTag[_.last(currentIf.index)].tag);
	// 				maxFor += currentIf.maxFor + (currentIf.childMaxFor || 0);
	// 				minFor += currentIf.minFor + (currentIf.childMinFor || 0);
	// 				currentIf = null;
	// 			}
	// 		} else if (tag.type === 'for') {
	// 			if (_.isEmpty(currentIf)) {
	// 				forOutsideIf += 1;
	// 				maxFor += 1;
	// 				minFor += 1;
	// 			} else {
	// 				currentIf.forCount += 1;
	// 			}
	// 		} else {
	// 			// console.log(`${_.padStart('', level * 2)}${tag.tag}`);
	// 		}
	// 	});
	// 	return {
	// 		totalFor, forOutsideIf, maxFor, minFor,
	// 	};
	// }
}

module.exports = ShopifyTheme;
