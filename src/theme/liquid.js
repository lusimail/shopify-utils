const _ = require('lodash');
const fs = require('fs');
const { getLiquidTags, getAssetUrls, removeCommentBlock } = require('./helper');

const REGEXP_JS = /(.js|.js.liquid)$/g;
const REGEXP_CSS = /(.css|.css.liquid|.scss|.scss.liquid)$/g;
const REGEXP_SCHEMA = /{%[\s-]*?schema[^]*?endschema[\s-]*?%}/g;
const REGEXP_SCHEMA_JSON = /(?<={%[\s-]*?schema[\s-]*?%})[^]*?(?={%[\s-]*?endschema[\s-]*?%})/g;

class LiquidFile {
	constructor(folder, filename, pathToTheme) {
		this.pathToTheme = pathToTheme;
		this.folder = folder;
		this.filename = filename;
		this.filepath = `${this.folder}/${this.filename}`;
		if (_.includes(this.filename, 'scss.liquid')) {
			this.basename = _.replace(this.filename, /scss.liquid$/, 'scss.css');
		} else {
			this.basename = _.replace(this.filename, /.liquid$/, '');
		}

		if (this.folder === 'assets') {
			if (this.filename.match(REGEXP_JS)) {
				this.assetType = 'js';
			} else if (this.filename.match(REGEXP_CSS)) {
				this.assetType = 'css';
			} else {
				this.assetType = 'other';
			}
		}

		if (this.folder !== 'assets' || this.assetType !== 'other') {
			this.readFileContent();
			this.analyzeContent();
		}

		this.isRendered = false;
	}

	isEqual(file) {
		return this.filepath === file.filepath;
	}

	readFileContent() {
		this.content = '';
		try {
			this.content = fs.readFileSync(`${this.pathToTheme}/${this.filepath}`, { encoding: 'utf-8' });
		} catch (error) {
			console.log(`Read file error ${this.filepath}: ${error}`);
		}
		this.content = removeCommentBlock(this.content);
	}

	analyzeContent() {
		if (this.folder === 'sections') {
			this.getSchema();
		}
		this.allTags = getLiquidTags(this.content);
		this.tags = _.groupBy(this.allTags, 'type');
		this.tags.snippet = [...(this.tags.include || []), ...(this.tags.render || [])];
		this.tags.section = this.tags.section || [];
		this.assets = {
			tags: _.filter(this.allTags, 'hasAsset'),
			urls: getAssetUrls(this.content),
		};
		if (_.includes(this.folder, 'templates')) {
			if (!_.isEmpty(this.tags.layout)) {
				const [layout] = this.tags.layout;
				this.renderLayout = { name: layout.quoted || layout.included };
			} else {
				this.renderLayout = { name: 'theme' };
			}
		}
		this.analyzeIncludes();
	}

	getSchema() {
		const json = this.content.match(REGEXP_SCHEMA_JSON);
		this.content = _.replace(this.content, REGEXP_SCHEMA, '');
		this.schema = {};
		if (!_.isEmpty(json)) {
			try {
				this.schema = JSON.parse(json);
			} catch (error) {
				console.log(`Schema parse error: ${this.filepath}`);
			}
		} else {
			console.log(`No schema found: ${this.filepath}`);
		}
		this.hasPreset = !_.isEmpty(this.schema.presets);
		if (this.hasPreset) {
			this.inIndex = false;
			this.renderTemplate = { name: 'index' };
		}
	}

	analyzeIncludes() {
		this.snippetUsed = _.filter(this.tags.snippet, (tag) => !_.isEmpty(tag.quoted));
		this.snippetVars = _.filter(this.tags.snippet, (tag) => _.isEmpty(tag.quoted));
		this.selfInclude = this.folder === 'snippets' && !_.isEmpty(_.find(this.tags.snippet, (tag) => (tag.quoted === this.basename || tag.quoted === this.filename)));
		this.sectionUsed = _.filter(this.tags.section, (tag) => !_.isEmpty(tag.quoted));
		this.sectionVars = _.filter(this.tags.section, (tag) => _.isEmpty(tag.quoted));
	}

	addRenderingFile(file, log) {
		if (log) console.log(`${this.filepath} rendered in ${file.filepath}`);
		this.renderedIn = this.renderedIn || [];
		this.renderedIn = _.unionWith(this.renderedIn, [file], (f1, f2) => (
			!_.isEmpty(f1) && !_.isEmpty(f2) && f1.isEqual(f2)));
		this.isRendered = this.renderedIn.length > 0;
	}

	render() {
		if (!_.isEmpty(this.renderedContent)) return this.renderedContent;
		this.renderedContent = this.content;
		this.renderedSnippetUsed = [];
		this.renderedSectionUsed = [];
		this.renderedAssets = {
			tags: [...(this.assets ? this.assets.tags : [])],
			urls: [...(this.assets ? this.assets.urls : [])],
		};
		const getRenderedResult = (tag, file, rendered) => {
			this.renderedContent = _.replace(this.renderedContent, tag.tag, rendered);
			this.renderedSnippetUsed = _.concat(this.renderedSnippetUsed, file.folder === 'snippets' ? [file] : [], file.renderedSnippetUsed);
			this.renderedSectionUsed = _.concat(this.renderedSectionUsed, file.folder === 'sections' ? [file] : [], file.renderedSectionUsed);
			this.renderedAssets.tags = _.concat(this.renderedAssets.tags, file.renderedAssets.tags);
			this.renderedAssets.urls = _.concat(this.renderedAssets.urls, file.renderedAssets.urls);
		};
		_.forEach(this.snippetUsed, (tag) => {
			// console.log('here', this.filepath, tag);
			if (tag.file) {
				// console.log('here2', tag.file);
				if (this.isEqual(tag.file)) {
					this.renderedContent = _.replace(this.renderedContent, tag.tag, '<!-- loop include -->');
				} else {
					const rendered = tag.file.render();
					// console.log('here3', tag.file.filepath, !_.isEmpty(rendered));
					getRenderedResult(tag, tag.file, rendered);
				}
			}
		});
		_.forEach(this.sectionUsed, (tag) => {
			if (tag.file) {
				const rendered = tag.file.render();
				getRenderedResult(tag, tag.file, rendered);
			}
		});
		return this.renderedContent;
	}

	renderWithLayout() {
		if (!_.isEmpty(this.renderedContentWithLayout)) return this.renderedContentWithLayout;
		if (_.isEmpty(this.renderedContent)) this.render();

		this.renderedContentWithLayout = this.renderedContent;
		const template = (!_.isEmpty(this.renderTemplate) && this.renderTemplate.file) || null;
		let layout;
		let templateContent = '{{ content_for_index }}';
		let layoutContent = '{{ content_for_layout }}';

		if (template) {
			templateContent = template.render();
			layout = (!_.isEmpty(template.renderLayout) && template.renderLayout.file) || null;
		} else {
			layout = (!_.isEmpty(this.renderLayout) && this.renderLayout.file) || null;
		}

		if (layout) layoutContent = layout.render();
		// console.log(layoutContent);
		let result = templateContent.replace(/\{\{\s*content_for_index\s*\}\}/g, this.renderedContent);
		result = layoutContent.replace(/\{\{\s*content_for_layout\s*\}\}/g, result);
		this.renderedContentWithLayout = result;

		return this.renderedContentWithLayout;
	}
}

module.exports = LiquidFile;
