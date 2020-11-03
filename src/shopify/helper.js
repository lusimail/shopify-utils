const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { getToFile } = require('./adminApi');

const settings = {
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
	pages: {
		urlPath: () => 'pages.json',
		filename: () => 'pages',
		prop: 'pages',
	},
};

const fetchData = async ({
	prop, auth, doOther, callback, folder = 'files', forceFetch = false, id: itemId, handle: itemHandle,
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
		data = await getToFile(auth, url, null, s.prop, null, filepath);
	}
	if (_.isFunction(callback)) { return callback(data); }
	return data;
};

module.exports.fetchData = fetchData;
