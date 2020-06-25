const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const config = require('config');
const { getToFile } = require('./shopifyAdminApi');

const args = process.argv.slice(2);
const storeFrom = args[0];
const storeTo = args[1];
const settingFilePath = args[2];

if (_.isEmpty(storeFrom) || _.isEmpty(storeFrom) || _.isEmpty(settingFilePath)) {
	console.log('Example usage: npm run adjustThemeSettings <storeFrom> <storeTo> <settingFilePath>');
	process.exit(1);
}

const authFrom = _.get(config, storeFrom);
const authTo = _.get(config, storeTo);

if (_.isEmpty(authFrom)) {
	console.log(`No authentications set for ${authFrom}`);
	process.exit(1);
}
if (_.isEmpty(authTo)) {
	console.log(`No authentications set for ${authTo}`);
	process.exit(1);
}

const files = {
	productsFrom: path.resolve(`./files/products-${storeFrom}.json`),
	collectionsFrom: path.resolve(`./files/collections-${storeFrom}.json`),
	settingsFrom: settingFilePath,
	productsTo: path.resolve(`./files/products-${storeTo}.json`),
	collectionsTo: path.resolve(`./files/collections-${storeTo}.json`),
	idMap: path.resolve(`./files/idMap-${storeFrom}-${storeTo}.json`),
};

const data = {};
const promises = [];

const getData = (file, {
	auth, urlPath, prop, doOther, callback,
}) => {
	if (fs.existsSync(files[file])) {
		console.log('Get existing data for', file);
		data[file] = require(files[file]);
		if (_.isFunction(callback)) callback(data[file]);
	} else if (_.isFunction(doOther)) {
		doOther();
	} else {
		console.log('Fetching from server:', file, 'urlPath:', urlPath);
		promises.push(getToFile(auth, urlPath, null, prop, null, files[file])
			.then((result) => {
				data[file] = result;
				if (_.isFunction(callback)) callback(data[file]);
			}));
	}
};

getData('settingsFrom', {
	doOther() {
		console.log(`${files.settingsFrom} does not exist`);
		process.exit(1);
	},
});
getData('idMap', { doOther() {} });
getData('productsFrom', { auth: authFrom, urlPath: 'products.json', prop: 'products' });
getData('productsTo', { auth: authTo, urlPath: 'products.json', prop: 'products' });
getData('collectionsFrom', { auth: authFrom, urlPath: 'custom_collections.json', prop: 'custom_collections' });
getData('collectionsTo', { auth: authTo, urlPath: 'custom_collections.json', prop: 'custom_collections' });

const createIdMap = () => {
	console.log('Creating id map for products, variants and collections');
	data.idMap = {};
	_.forEach(data.productsFrom, (product) => {
		const newP = _.find(data.productsTo, (p) => p.handle === product.handle);
		if (newP) {
			data.idMap[product.id] = newP.id;
			_.forEach(product.variants, (variant) => {
				const newV = _.find(newP.variants, (v) => v.title === variant.title || v.sku === variant.sku);
				if (newV) {
					data.idMap[variant.id] = newV.id;
				} else { console.log('No variant in', storeTo, product.id, product.title); }
			});
		} else {
			console.log('No product in', storeTo, product.id, product.title);
		}
	});
	_.forEach(data.collectionsFrom, (coll) => {
		const newC = _.find(data.collectionsTo, (c) => c.handle === coll.handle);
		if (newC) {
			data.idMap[coll.id] = newC.id;
		} else { console.log('No collection in', storeTo, coll.id, coll.handle); }
	});
	fs.writeFileSync(files.idMap, JSON.stringify(data.idMap, null, 2));
};

// console.log('promises.length', promises.length);
Promise.all(promises)
	.then(() => {
		createIdMap();
		// console.log(data.settingsFrom);

		let newSettings = JSON.stringify(data.settingsFrom, null, 2);
		_.forEach(data.idMap, (newId, oldId) => {
			newSettings = _.replace(newSettings, new RegExp(oldId, 'g'), newId);
		});
		fs.writeFileSync(`files/settings_data-${storeTo}.json`, newSettings);
	});
