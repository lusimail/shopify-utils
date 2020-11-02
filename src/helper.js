const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { getToFile } = require('./shopifyAdminApi');

const settings = {
	products: {
		urlPath: () => 'products.json',
		filename: (store) => `products-${store}`,
		prop: 'products',
	},
	collections: {
		urlPath: () => 'custom_collections.json',
		filename: (store) => `collections-${store}`,
		prop: 'custom_collections',
	},
	productMetafield: {
		urlPath: (id) => `products/${id}/metafields.json`,
		filename: (store, id, handle) => `product-${store}-${id}${handle ? `-${handle}` : ''}`,
		prop: 'metafields',
	},
	collectionMetafield: {
		urlPath: (id) => `collections/${id}/metafields.json`,
		filename: (store, id, handle) => `collection-${store}-${id}${handle ? `-${handle}` : ''}`,
		prop: 'metafields',
	},
	pages: {
		urlPath: () => 'pages.json',
		filename: (store) => `pages-${store}`,
		prop: 'pages',
	},
};

const fetchData = async ({
	store, prop, auth, doOther, callback, folder = 'files', forceFetch = false, id: itemId, handle: itemHandle,
}) => {
	let data;
	const s = settings[prop];
	if (_.isEmpty(s)) {
		console.log(`Property ${prop} is not defined`);
		return null;
	}
	const file = `${folder}/${s.filename(store, itemId, itemHandle)}.json`;
	const filepath = path.resolve(file);
	if (fs.existsSync(filepath) && !forceFetch) {
		console.log('Get existing data for', file);
		data = require(filepath);
	} else if (_.isFunction(doOther)) {
		return doOther();
	} else {
		const url = s.urlPath(itemId);
		console.log('Fetching from server:', file, 'urlPath:', url);
		data = await getToFile(auth, url, null, s.prop, null, filepath);
	}
	if (_.isFunction(callback)) { return callback(data); }
	return data;
};

module.exports.fetchData = fetchData;
