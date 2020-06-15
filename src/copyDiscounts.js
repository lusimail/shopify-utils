const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const config = require('config');
const { getToFile, apiGet, apiPost } = require('./shopifyAdminApi');

const args = process.argv.slice(2);
const storeFrom = args[0];
const storeTo = args[1];

if (_.isEmpty(storeFrom) || _.isEmpty(storeFrom)) {
	console.log('Example usage: npm run copyDiscounts <storeFrom> <storeTo>');
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
	priceRulesFrom: path.resolve(`./files/priceRules-${storeFrom}.json`),
	discountCodeFrom: path.resolve(`./files/discountCode-${storeFrom}.json`),
	productsTo: path.resolve(`./files/products-${storeTo}.json`),
	collectionsTo: path.resolve(`./files/collections-${storeTo}.json`),
	priceRulesTo: path.resolve(`./files/priceRules-${storeTo}.json`),
	discountCodeTo: path.resolve(`./files/discountCode-${storeTo}.json`),
	idMap: path.resolve(`./files/idMap-${storeFrom}-${storeTo}.json`),
};

const data = {};
const promises = [];
const promises2 = [];

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

getData('idMap', { doOther() {} });
getData('productsFrom', { auth: authFrom, urlPath: 'products.json', prop: 'products' });
getData('productsTo', { auth: authTo, urlPath: 'products.json', prop: 'products' });
getData('collectionsFrom', { auth: authFrom, urlPath: 'custom_collections.json', prop: 'custom_collections' });
getData('collectionsTo', { auth: authTo, urlPath: 'custom_collections.json', prop: 'custom_collections' });
getData('priceRulesFrom', {
	auth: authFrom,
	urlPath: 'price_rules.json',
	prop: 'price_rules',
	callback: (priceRules) => {
		getData('discountCodeFrom', {
			doOther() {
				data.discountCodeFrom = {};
				_.forEach(priceRules, (rule) => {
					promises2.push(apiGet(authFrom, `price_rules/${rule.id}/discount_codes.json`)
						.then((d) => { data.discountCodeFrom[rule.id] = d.discount_codes; }));
				});
			},
		});
	},
});
getData('priceRulesTo', { auth: authTo, urlPath: 'price_rules.json', prop: 'price_rules' });

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

const makeRule = ({
	id, created_at, updated_at, admin_graphql_api_id, customer_selection,
	prerequisite_saved_search_ids, entitled_country_ids, prerequisite_customer_ids,
	...rule
}) => {
	const replaceId = (i) => {
		if (data.idMap[i]) return data.idMap[i];
		console.log('Id replace not found', i);
		return undefined;
	};
	if (customer_selection !== 'all') {
		console.log(`Rule ${id}, customer selection is '${customer_selection}', overwriting to 'all', please check in admin panel`);
	}
	if (!_.isEmpty(prerequisite_saved_search_ids)) {
		console.log(`Rule ${id}, prerequisite_saved_search_ids not empty, skipping setting, please check in admin panel`);
	}
	if (!_.isEmpty(entitled_country_ids)) {
		console.log(`Rule ${id}, entitled_country_ids not empty, skipping setting, please check in admin panel`);
	}
	if (!_.isEmpty(prerequisite_customer_ids)) {
		console.log(`Rule ${id}, prerequisite_customer_ids not empty, skipping setting, please check in admin panel`);
	}
	return {
		...rule,
		customer_selection: 'all',
		entitled_product_ids: _.map(rule.entitled_product_ids, replaceId),
		entitled_variant_ids: _.map(rule.entitled_variant_ids, replaceId),
		entitled_collection_ids: _.map(rule.entitled_collection_ids, replaceId),
		prerequisite_product_ids: _.map(rule.prerequisite_product_ids, replaceId),
		prerequisite_variant_ids: _.map(rule.prerequisite_variant_ids, replaceId),
		prerequisite_collection_ids: _.map(rule.prerequisite_collection_ids, replaceId),
	};
};

// console.log('promises.length', promises.length);
Promise.all(promises)
	.then(() => {
		// console.log('promises2.length', promises2.length);
		return Promise.all(promises2);
	})
	.then(() => {
		if (!_.isEmpty(data.discountCodeFrom)) {
			fs.writeFileSync(files.discountCodeFrom, JSON.stringify(data.discountCodeFrom, null, 2));
		}

		console.log('store', storeFrom, 'products', data.productsFrom.length);
		console.log('store', storeFrom, 'collections', data.collectionsFrom.length);
		console.log('store', storeFrom, 'priceRules', data.priceRulesFrom.length);
		console.log('store', storeTo, 'products', data.productsTo.length);
		console.log('store', storeTo, 'collections', data.collectionsTo.length);
		console.log('store', storeTo, 'priceRules', data.priceRulesTo.length);

		if (_.isEmpty(data.idMap)) createIdMap();
		// console.log(JSON.stringify(data.idMap, null, 2));

		_.forEach(data.priceRulesFrom, (ruleFrom) => {
			const discounts = data.discountCodeFrom[ruleFrom.id];
			if (discounts.length > 1) {
				console.log('Price rule:', ruleFrom.id, ruleFrom.title, 'have more than 1 discount code, possibly created from an app. Skipping rule.');
			} else {
				apiPost(authTo, 'price_rules.json', { price_rule: makeRule(ruleFrom) })
					.then(({ price_rule: ruleTo }) => {
						console.log('Price rule created:', ruleTo.id, ruleTo.title);
						apiPost(authTo, `price_rules/${ruleTo.id}/discount_codes.json`, { discount_code: { code: ruleTo.title } })
							.then(() => {
								console.log('Discount code created:', ruleTo.title);
							}).catch((err) => console.log('Discount code error:', ruleTo.title, err.toJSON()));
					}).catch((err) => console.log('Price rule error:', ruleFrom.title, err.toJSON()));
			}
		});
	});
