const _ = require('lodash');

const REGEXP_LIQUID_TAG = /({%[^]*?%})|({{[^]*?}})/g;
const REGEXP_ASSET_TAG = /[^a-z_]+(asset_url|asset_img_url)[^a-z_]?/i;
const REGEXP_ASSET_URL = /cdn.shopify.com\/s\/files.*?\/assets\/[^?'")\n]*/g;
const REGEXP_QUOTED = /(?<=['"`]).*?(?=['"`])/;

module.exports.getLiquidTags = (content) => {
	const tags = content.match(REGEXP_LIQUID_TAG);
	return _.map(tags, (tag) => {
		const start = _.startsWith(tag, '{%-') || _.startsWith(tag, '{{-') ? 3 : 2;
		const end = _.endsWith(tag, '-%}') || _.startsWith(tag, '-}}') ? -3 : -2;
		const tagContent = _.trim(_.slice(tag, start, end).join(''));
		const hasAsset = REGEXP_ASSET_TAG.test(tagContent);
		const result = {
			tag,
			content: tagContent,
			type: 'object',
			hasAsset,
		};
		if (_.startsWith(tag, '{%')) {
			const split = _.split(tagContent, /[\s,;:]+/);
			const [type, included] = split;
			result.type = type.toLowerCase();
			result.split = split;
			if (_.includes(['include', 'render', 'section'], result.type) && !_.isEmpty(included)) {
				const quoted = included.match(REGEXP_QUOTED);
				result.included = included;
				if (!_.isEmpty(quoted)) {
					[result.quoted] = quoted;
				}
			}
		}
		return result;
	});
};

module.exports.getAssetUrls = (content) => {
	const urls = content.match(REGEXP_ASSET_URL) || [];
	return _.map(urls, (url) => ({
		tag: url,
		content: url,
		type: 'url',
		hasAsset: true,
	}));
};

const findIndexes = (string, regex, lastIndex = false) => {
	const indexes = [];
	const localRegex = new RegExp(regex, regex.flags);
	let res = localRegex.exec(string);
	while (res != null) {
		if (lastIndex) {
			indexes.push(localRegex.lastIndex);
		} else {
			indexes.push(res.index);
		}
		res = localRegex.exec(string);
	}
	return indexes;
};

const removeCommentBlock = (content) => {
	const comment = findIndexes(content, /{%[\s-]*?comment[\s-]*?%}/g);
	const endcomment = findIndexes(content, /{%[\s-]*?endcomment[\s-]*?%}/g, true);
	let index1 = 0;
	let index2 = 0;
	let removed = 0;
	let result = content;
	// console.log(comment, endcomment);
	while (index1 < comment.length && index2 < endcomment.length) {
		const lastIndex = endcomment[index2];
		const smaller = _.filter(comment, (i) => i < lastIndex);
		// console.log('here', lastIndex, smaller);
		if (smaller.length === index2 + 1) {
			// console.log('number match', smaller.length, index2 + 1);
			const start = comment[index1] - removed;
			const end = endcomment[index2] - removed;
			// console.log('removing', start, end);
			result = result.slice(0, start) + result.slice(end);
			removed += end - start;
			index2 += 1;
			index1 = index2;
		} else {
			index2 += 1;
		}
	}
	// console.log(result);
	return result;
};
module.exports.removeCommentBlock = removeCommentBlock;

module.exports.unionTags = (...arrays) => (
	_.unionBy(...arrays, 'tag')
);
