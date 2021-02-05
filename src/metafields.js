const _ = require('lodash');
const fs = require('fs');
const config = require('config');
const minimist = require('minimist');
const { Store } = require('./shopify/store');

const args = minimist(process.argv.slice(2));
const {
	_: [storeFrom, storeTo],
	action,
	resource,
	n: namespacesFile,
	handle: itemHandle,
	handle2: itemHandleTo,
	id: itemId,
	id2: itemIdTo,
	v: verbose,
	dry,
} = args;

if (_.isEmpty(storeFrom) || (action === 'post' && _.isEmpty(storeTo))) {
	console.log('Example usage 1: npm run getProductMetafields <storeFrom>');
	console.log('Example usage 2: npm run postProductMetafields <storeFrom> <storeTo> -- -n <namespacesFile> [options]');
	console.log('Example usage 3: npm run getCollectionMetafields <storeFrom>');
	console.log('Example usage 4: npm run postCollectionMetafields <storeFrom> <storeTo> -- -n <namespacesFile> [options]');
	console.log('--dry         Dry run');
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

const doStuff = async () => {
	const store = new Store(storeFrom, authFrom.apiKey, authFrom.apiPass, authFrom.hostname, `files/${storeFrom}`);
	await store.metafields.getAllMetafields(resource);

	if (action === 'post') {
		const store2 = (storeFrom === storeTo) ? store : new Store(storeTo, authTo.apiKey, authTo.apiPass, authTo.hostname, `files/${storeTo}`);
		await store2.metafields.setMetafields(resource, store.metafields[resource]);

		let namespaces = [];
		if (!_.isEmpty(namespacesFile)) {
			const content = fs.readFileSync(namespacesFile, { encoding: 'utf-8' });
			namespaces = content.split('\n');
			_.remove(namespaces, _.isEmpty);
		}

		let itemFrom;
		let itemTo;
		if (!_.isEmpty(itemId) || _.isInteger(itemId)) {
			itemFrom = await store[resource].getBy('id', itemId);
		} else if (!_.isEmpty(itemHandle)) {
			itemFrom = await store[resource].getBy('id', itemHandle);
		}
		if (!_.isEmpty(itemIdTo) || !_.isEmpty(itemId) || _.isInteger(itemIdTo) || _.isInteger(itemId)) {
			itemTo = await store2[resource].getBy('id', itemIdTo || itemId);
		} else if (!_.isEmpty(itemHandleTo) || !_.isEmpty(itemHandle)) {
			itemTo = await store2[resource].getBy('id', itemHandleTo || itemHandle);
		}

		if (_.isEmpty(itemFrom)) {
			await store2.metafields.postAllMetafields({
				resource, dry, verbose, filter: namespaces,
			});
		} else {
			store2.metafields[resource][itemTo.handle] = store.metafields[resource][itemFrom.handle];
			await store2.metafields.postMetafields({
				handle: itemTo.handle, resource, dry, verbose, filter: namespaces,
			});
		}
	}
};

doStuff();
