const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { getToFile } = require('./adminApi');

const settings = {
	themes: {
		urlPath: () => 'themes.json',
		filename: () => 'themes',
		prop: 'themes',
	},
	products: {
		urlPath: () => 'products.json',
		filename: () => 'products',
		prop: 'products',
	},
	collections: {
		urlPath: () => 'custom_collections.json',
		filename: () => 'collections',
		prop: 'custom_collections',
	},
	productsMetafield: {
		urlPath: (id) => `products/${id}/metafields.json`,
		filename: (id, handle) => `meta-product-${handle}`,
		prop: 'metafields',
	},
	collectionsMetafield: {
		urlPath: (id) => `collections/${id}/metafields.json`,
		filename: (id, handle) => `meta-collection-${handle}`,
		prop: 'metafields',
	},
	articlesMetafield: {
		urlPath: (id) => `articles/${id}/metafields.json`,
		filename: (id, handle) => `meta-article-${handle}`,
		prop: 'metafields',
	},
	pages: {
		urlPath: () => 'pages.json',
		filename: () => 'pages',
		prop: 'pages',
	},
	blogs: {
		urlPath: () => 'blogs.json',
		filename: () => 'blogs',
		prop: 'blogs',
	},
	articles: {
		urlPath: (id) => `blogs/${id}/articles.json`,
		filename: (id, handle) => `articles-${handle}`,
		prop: 'articles',
	},
	redirects: {
		urlPath: () => 'redirects.json',
		filename: () => 'redirects',
		prop: 'redirects',
	},
};

const fetchData = async ({
	prop, auth, doOther, callback, folder = 'files', forceFetch = false, id: itemId, handle: itemHandle, attrs = null,
}) => {
	let data;
	const s = settings[prop];
	if (_.isEmpty(s)) {
		console.log(`Property ${prop} is not defined`);
		return null;
	}
	const file = `${folder}/${s.filename(itemId, itemHandle)}.json`;
	const filepath = path.resolve(file);
	if (fs.existsSync(filepath) && !forceFetch) {
		console.log('Get existing data for', file);
		data = require(filepath);
	} else if (_.isFunction(doOther)) {
		return doOther();
	} else {
		const url = s.urlPath(itemId);
		console.log('Fetching from server:', url, 'filePath:', file);
		data = await getToFile(auth, url, null, s.prop, attrs, filepath)
			.catch((err) => {
				console.log(`Fetch error: ${prop} ${itemId}`, JSON.stringify(err, null, 2));
				throw new Error();
			});
	}
	if (_.isFunction(callback)) { return callback(data); }
	return data;
};

module.exports.fetchData = fetchData;
