const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const config = require('config');
const minimist = require('minimist');
const { getToFile, apiGet, apiPost } = require('./shopifyAdminApi');

const args = minimist(process.argv.slice(2));
const {
	_: [storeFrom, storeTo],
	v: verbose,
	dry,
} = args;

if (_.isEmpty(storeFrom) || _.isEmpty(storeFrom)) {
	console.log('Example usage: npm run copyDiscounts <storeFrom> <storeTo> -- [options]');
	console.log('--dry         Dry run');
	console.log('-v            Verbose');
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
	productsFrom: path.resolve(`./files/${storeFrom}/products.json`),
	collectionsFrom: path.resolve(`./files/${storeFrom}/collections.json`),
	priceRulesFrom: path.resolve(`./files/${storeFrom}/price_rules.json`),
	discountCodeFrom: path.resolve(`./files/${storeFrom}/discount_code.json`),
	productsTo: path.resolve(`./files/${storeTo}/products.json`),
	collectionsTo: path.resolve(`./files/${storeTo}/collections.json`),
	priceRulesTo: path.resolve(`./files/${storeTo}/price_rules.json`),
	discountCodeTo: path.resolve(`./files/${storeTo}/discount_code.json`),
	idMap: path.resolve(`./files/idMap-${storeFrom}-${storeTo}.json`),
};

const data = {};

const getData = async (file, {
	auth, urlPath, prop, doOther, callback,
}) => {
	if (fs.existsSync(files[file])) {
		console.log('Get existing data for', file);
		data[file] = require(files[file]);
		if (_.isFunction(callback)) {
			await callback(data[file]);
		}
	} else if (_.isFunction(doOther)) {
		await doOther();
	} else {
		console.log('Fetching from server:', file, 'urlPath:', urlPath);
		await getToFile(auth, urlPath, null, prop, null, files[file])
			.then(async (result) => {
				data[file] = result;
				if (_.isFunction(callback)) await callback(data[file]);
			});
	}
};

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

const doStuff = async () => {
	await getData('idMap', { doOther() {} });
	await getData('productsFrom', { auth: authFrom, urlPath: 'products.json', prop: 'products' });
	await getData('productsTo', { auth: authTo, urlPath: 'products.json', prop: 'products' });
	await getData('collectionsFrom', { auth: authFrom, urlPath: 'custom_collections.json', prop: 'custom_collections' });
	await getData('collectionsTo', { auth: authTo, urlPath: 'custom_collections.json', prop: 'custom_collections' });
	await getData('priceRulesFrom', {
		auth: authFrom,
		urlPath: 'price_rules.json',
		prop: 'price_rules',
		callback: async (priceRules) => {
			await getData('discountCodeFrom', {
				async doOther() {
					data.discountCodeFrom = {};
					for (let r = 0; r < priceRules.length; r += 1) {
						const rule = priceRules[r];
						console.log(`Get price rule ${rule.id}`);
						await apiGet(authFrom, `price_rules/${rule.id}/discount_codes.json`)
							.then((d) => { data.discountCodeFrom[rule.id] = d.discount_codes; });
					}
				},
			});
		},
	});
	await getData('priceRulesTo', { auth: authTo, urlPath: 'price_rules.json', prop: 'price_rules' });

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
		} else if (dry) {
			console.log('Price rule to create:', ruleFrom.id, ruleFrom.title);
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
}

doStuff();
