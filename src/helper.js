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
		filename: (store, id) => `product-${store}-${id}`,
		prop: 'metafields',
	},
	collectionMetafield: {
		urlPath: (id) => `collections/${id}/metafields.json`,
		filename: (store, id) => `collection-${store}-${id}`,
		prop: 'metafields',
	},
};

const fetchData = async ({
	store, prop, auth, doOther, callback, folder = 'files', forceFetch = false, ids = [],
}) => {
	let data;
	const s = settings[prop];
	const file = `./${folder}/${s.filename(store, ...ids)}.json`;
	const filepath = path.resolve(file);
	if (fs.existsSync(filepath) && !forceFetch) {
		console.log('Get existing data for', file);
		data = require(filepath);
	} else if (_.isFunction(doOther)) {
		return doOther();
	} else {
		const url = s.urlPath(...ids);
		console.log('Fetching from server:', file, 'urlPath:', url);
		data = await getToFile(auth, url, null, s.prop, null, filepath);
	}
	if (_.isFunction(callback)) { return callback(data); }
	return data;
};

module.exports.fetchData = fetchData;
