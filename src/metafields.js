const _ = require('lodash');
const mkdirp = require('mkdirp');
const fs = require('fs');
const config = require('config');
const minimist = require('minimist');
const { apiPost } = require('./shopifyAdminApi');
const { fetchData } = require('./helper');

const args = minimist(process.argv.slice(2));
const {
	_: [storeFrom, storeTo],
	action,
	prop,
	n: namespacesFile,
	handle: itemHandle,
	handle2: itemHandleTo,
	id: itemId,
	id2: itemIdTo,
	v: verbose,
	dry,
	f: forceReplace,
} = args;

if (_.isEmpty(storeFrom) || (action === 'post' && _.isEmpty(storeTo))) {
	console.log('Example usage 1: npm run getProductMetafields <storeFrom>');
	console.log('Example usage 2: npm run postProductMetafields <storeFrom> <storeTo> -- -n <namespacesFile> [options]');
	console.log('Example usage 3: npm run getCollectionMetafields <storeFrom>');
	console.log('Example usage 4: npm run postCollectionMetafields <storeFrom> <storeTo> -- -n <namespacesFile> [options]');
	console.log('--dry         Dry run');
	console.log('-f            Force replace existing metafield');
	console.log('-v            Verbose');
	console.log('-n            Namespaces to migrate');
	console.log('--handle      Product / Collection Handle');
	console.log('--handle2     Product / Collection Handle destination (same as above if not defined)');
	console.log('--id          Product / Collection Id (will take priority over handle)');
	console.log('--id2         Product / Collection Id destination (same as above if not defined, will take priority over handle)');
	process.exit();
}

const authFrom = _.get(config, storeFrom);
const authTo = _.get(config, storeTo);

const data = {};
mkdirp.sync('files/metafields');

const getData = async () => {
	data.productsFrom = await fetchData({ store: storeFrom, auth: authFrom, prop: 'products' });
	data.collectionsFrom = await fetchData({ store: storeFrom, auth: authFrom, prop: 'collections' });
	if (!_.isEmpty(storeTo)) {
		data.productsTo = await fetchData({ store: storeTo, auth: authTo, prop: 'products' });
		data.collectionsTo = await fetchData({ store: storeTo, auth: authTo, prop: 'collections' });
	}
};

const getMetafields = async (store, auth, items, forceFetch = false) => {
	const metafields = {};
	console.log(`Fetching metafields for ${store}, ${items.length} items`);
	for (let i = 0; i < items.length; i += 1) {
		const item = items[i];
		// eslint-disable-next-line no-await-in-loop
		const metas = await fetchData({
			store, auth, prop: `${prop}Metafield`, ids: [item.id], folder: 'files/metafields', forceFetch,
		});
		metafields[item.id] = metas;
	}
	return metafields;
};

const postMetafields = async (fromItem, toItem, namespaces) => {
	if (dry) {
		console.log(`${prop}: ${fromItem.handle}`);
	}
	const metasFrom = data.metasFrom[fromItem.id];
	const metasTo = data.metasTo[toItem.id];
	const toPost = _.isEmpty(namespaces) ? metasFrom : _.filter(metasFrom, (meta) => _.includes(namespaces, meta.namespace) || _.includes(namespaces, `${meta.namespace}.${meta.key}`));
	let exist = 0;
	let create = 0;
	let error = 0;
	for (let i = 0; i < toPost.length; i += 1) {
		const meta = toPost[i];
		const inMetasTo = _.find(metasTo, (m) => meta.namespace === m.namespace && meta.key === m.key);
		if (!_.isEmpty(inMetasTo) && !forceReplace) {
			exist += 1;
			if (dry || verbose) {
				console.log(`Metafields exist: ${meta.namespace} ${meta.key}`);
			}
		} else if (dry) {
			create += 1;
			console.log(`To post: ${meta.namespace}.${meta.key}`);
		} else {
			const newMeta = {
				metafield: {
					namespace: meta.namespace,
					key: meta.key,
					value: meta.value,
					value_type: meta.value_type,
				},
			};
			// eslint-disable-next-line no-await-in-loop
			await apiPost(authTo, `${prop}s/${toItem.id}/metafields.json`, newMeta)
				// eslint-disable-next-line no-loop-func
				.then(() => {
					create += 1;
					if (verbose) console.log(`Metafield created: ${meta.namespace} ${meta.key}`);
				// eslint-disable-next-line no-loop-func
				}).catch((err) => {
					error += 1;
					console.log(`Metafield error: ${meta.namespace} ${meta.key}`, JSON.stringify(err, null, 2));
				});
		}
	}
	console.log(`${prop}: ${fromItem.handle} ${exist} exist, ${create} create, ${error} error`);
};

const doStuff = async () => {
	await getData();
	let itemsFrom = prop === 'product' ? data.productsFrom : data.collectionsFrom;
	let itemsTo = prop === 'product' ? data.productsTo : data.collectionsTo;
	if (!_.isEmpty(itemId) || _.isInteger(itemId)) {
		itemsFrom = _.filter(itemsFrom, ['id', itemId]);
	} else if (!_.isEmpty(itemHandle)) {
		itemsFrom = _.filter(itemsFrom, ['handle', itemHandle]);
	}
	if (!_.isEmpty(itemIdTo) || !_.isEmpty(itemId) || _.isInteger(itemIdTo) || _.isInteger(itemId)) {
		itemsTo = _.filter(itemsTo, ['id', itemIdTo || itemId]);
	} else if (!_.isEmpty(itemHandleTo) || !_.isEmpty(itemHandle)) {
		itemsTo = _.filter(itemsTo, ['handle', itemHandleTo || itemHandle]);
	}

	data.metasFrom = await getMetafields(storeFrom, authFrom, itemsFrom);
	if (!_.isEmpty(storeTo)) data.metasTo = await getMetafields(storeTo, authTo, itemsTo, true);

	if (action === 'post') {
		let namespaces = [];
		if (!_.isEmpty(namespacesFile)) {
			const content = fs.readFileSync(namespacesFile, { encoding: 'utf-8' });
			namespaces = content.split('\n');
			_.remove(namespaces, _.isEmpty);
		}

		for (let k = 0; k < itemsFrom.length; k += 1) {
			const from = itemsFrom[k];
			const to = _.find(itemsTo, { handle: from.handle });
			if (!_.isEmpty(to)) {
				postMetafields(from, to, namespaces);
			}
		}
	}
};

doStuff();
