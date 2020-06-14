const _ = require('lodash');
const fs = require('fs');

const FOLDER_THEME = ['config', 'layout', 'locales', 'sections', 'snippets', 'templates', 'templates/customers'];
const FOLDER_TO_CHECK = ['layout', 'sections', 'snippets', 'templates', 'templates/customers'];
const REGEXP_JS = /(.js|.js.liquid)$/g;
const REGEXP_CSS = /(.css|.css.liquid|.scss|.scss.liquid)$/g;
const REGEXP_LIQUID_TAG = /{%.*?%}/g;
const REGEXP_QUOTED = /(?<=['"`]).*?(?=['"`])/;
const REGEXP_COMMENT = /{%.{0,3}comment[^]*?endcomment.{0,3}%}/g;
const REGEXP_COMMENT_HTML = /<!--[^]*?-->/g;
const REGEXP_SCHEMA = /{%.{0,3}schema[^]*?endschema.{0,3}%}/g;
const REGEXP_SCHEMA_JSON = /(?<={%.{0,3}schema.{0,3}%})[^]*?(?={%.{0,3}endschema.{0,3}%})/g;

class ShopifyTheme {
	constructor(pathToTheme) {
		this.pathToTheme = pathToTheme;
		this.files = {};
		this.filenames = {};
		this.themeStats = {
			folder: {},
			totalFiles: 0,
		};
		this.assets = { js: [], css: [], other: [] };
		this.snippets = { used: [], unused: [], loopCall: [] };
		this.sections = { used: [], unused: [], preset: [] };

		this.readThemeFiles();
		this.processSections();
		this.checkIncludesAndSections();
		this.snippets.unused = _.without(this.filenames.snippets, ...this.snippets.used);
		this.sections.unused = _.without(this.filenames.sections, ...this.sections.used, ...this.sections.preset);
	}

	readThemeFiles() {
		this.readAssetFiles();
		_.forEach(FOLDER_THEME, (folder) => {
			const path = `${this.pathToTheme}/${folder}`;
			const filenames = fs.readdirSync(path);
			this.files[folder] = {};
			this.filenames[folder] = filenames;
			if (folder === 'templates') _.remove(filenames, (n) => n === 'customers');

			this.themeStats.folder[folder] = filenames.length;
			this.themeStats.totalFiles += filenames.length;

			_.forEach(filenames, (filename) => {
				let content = fs.readFileSync(`${path}/${filename}`, { encoding: 'utf-8' });
				content = _.replace(content, REGEXP_COMMENT, '');
				content = _.replace(content, REGEXP_COMMENT_HTML, '');
				this.files[folder][filename] = { content };
			});
		});
	}

	readAssetFiles() {
		const path = `${this.pathToTheme}/assets`;
		this.filenames.assets = fs.readdirSync(path);
		this.themeStats.folder.assets = this.filenames.assets.length;
		this.themeStats.totalFiles += this.filenames.assets.length;
		this.assets.js = _.filter(this.filenames.assets, (n) => n.match(REGEXP_JS));
		this.assets.css = _.filter(this.filenames.assets, (n) => n.match(REGEXP_CSS));
		this.assets.other = _.filter(this.filenames.assets, (n) => !n.match(REGEXP_JS) && !n.match(REGEXP_CSS));
	}

	processSections() {
		_.forEach(this.filenames.sections, (file) => {
			const { content } = this.files.sections[file];
			if (!content) return;
			const json = content.match(REGEXP_SCHEMA_JSON);
			this.files.sections[file].content = _.replace(this.content, REGEXP_SCHEMA, '');
			if (!_.isEmpty(json)) {
				const schema = JSON.parse(json);
				this.files.sections[file].schema = schema;
				if (!_.isEmpty(schema.presets)) {
					this.sections.preset.push(file);
				}
			}
		});
	}

	getLiquidTags(content) {
		const liquidTag = content.match(REGEXP_LIQUID_TAG);
		return _.map(liquidTag, (tag) => {
			const start = _.startsWith(tag, '{%-') ? 3 : 2;
			const end = _.endsWith(tag, '-%}') ? -3 : -2;
			let split = _.slice(tag, start, end).join('');
			split = _.trim(split);
			split = _.split(split, /\s+/);
			return { tag, type: split[0], split };
		});
	}

	processLiquidFile(folder, file) {
		const { content } = this.files[folder][file];
		const liquidTag = this.getLiquidTags(content);
		this.files[folder][file].liquidTag = _.map(liquidTag, (tag) => {
			const result = { ...tag };
			if (tag.split.length === 1) return result;
			const firstVar = tag.split[1];
			const filename = `${(firstVar.match(REGEXP_QUOTED) || [''])[0]}.liquid`;
			if (tag.type === 'include' || tag.type === 'render') {
				if (folder === 'snippets' && filename === file) {
					this.snippets.loopCall.push(filename);
				} else if (!_.includes(this.filenames.snippets, filename)) {
					this.includesNotFile.push(tag);
				} else {
					if (!_.includes(this.snippets.used, filename)) this.snippets.used.push(filename);
					result.filename = filename;
				}
			} else if (tag.type === 'section') {
				if (!_.includes(this.filenames.sections, filename)) {
					this.sectionsNotFile.push(tag);
				} else {
					if (!_.includes(this.sections.used, filename)) this.sections.used.push(filename);
					result.filename = filename;
				}
			}
			return result;
		});
	}

	checkIncludesAndSections() {
		this.includesNotFile = [];
		this.sectionsNotFile = [];
		_.forEach(FOLDER_TO_CHECK, (folder) => {
			_.forEach(this.filenames[folder], (file) => {
				this.processLiquidFile(folder, file);
			});
		});
		this.includesNotFile = _.uniq(this.includesNotFile);
		this.sectionsNotFile = _.uniq(this.sectionsNotFile);
	}

	compileFile(folder, file) {
		if (_.isEmpty(this.files[folder][file])) return '';
		const { content, liquidTag, compileResult } = this.files[folder][file];
		if (!_.isEmpty(compileResult)) return compileResult;
		let result = content;
		_.forEach(_.filter(liquidTag, (t) => _.includes(['include', 'render', 'section'], t.type)), (t) => {
			if (!_.isEmpty(t.filename)) {
				result = _.replace(result, t.tag, this.compileFile(t.type === 'section' ? 'sections' : 'snippets', t.filename));
			}
		});
		this.files[folder][file].compileResult = result;
		return result;
	}

	analyzeFile(folder, file) {
		const compileResult = this.compileFile(folder, file);
		const liquidTag = this.getLiquidTags(compileResult);

		let totalFor = 0;
		let maxFor = 0;
		let minFor = 0;
		const ifBlock = [];
		const stack = [];
		let currentIf = null;
		_.forEach(liquidTag, (tag, index) => {
			if (_.includes(['if', 'unless', 'case'], tag.type)) {
				if (!_.isEmpty(currentIf)) { stack.push(currentIf); }
				currentIf = {
					index: [index], forCount: 0, maxFor: 0, minFor: null,
				};
			} else if (_.includes(['elsif', 'else', 'when'], tag.type)) {
				currentIf.index.push(index);
				if (currentIf.maxFor < currentIf.forCount) currentIf.maxFor = currentIf.forCount;
				if (currentIf.minFor === null || currentIf.minFor > currentIf.forCount) currentIf.minFor = currentIf.forCount;
				currentIf.forCount = 0;
			} else if (_.includes(['endif', 'endunless', 'endcase'], tag.type)) {
				currentIf.index.push(index);
				if (currentIf.maxFor < currentIf.forCount) currentIf.maxFor = currentIf.forCount;
				if (currentIf.minFor === null || currentIf.minFor > currentIf.forCount) currentIf.minFor = currentIf.forCount;
				currentIf.forCount = 0;
				if (!_.isEmpty(stack)) {
					const parentIf = stack.pop();
					parentIf.index.push(currentIf.index);
					parentIf.childMaxFor = currentIf.maxFor + (currentIf.childMaxFor || 0);
					parentIf.childMinFor = currentIf.minFor + (currentIf.childMinFor || 0);
					currentIf = parentIf;
				} else {
					ifBlock.push(currentIf);
					maxFor += currentIf.maxFor + (currentIf.childMaxFor || 0);
					minFor += currentIf.minFor + (currentIf.childMinFor || 0);
					currentIf = null;
				}
			} else if (tag.type === 'for') {
				totalFor += 1;
				if (_.isEmpty(currentIf)) {
					maxFor += 1;
					minFor += 1;
				} else {
					currentIf.forCount += 1;
				}
			}
		});

		return {
			compileResult, totalFor, maxFor, minFor,
		};
	}
}

module.exports = ShopifyTheme;
