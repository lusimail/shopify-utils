const _ = require('lodash');
const fs = require('fs');
const config = require('config');
const minimist = require('minimist');
const Papa = require('papaparse');
const { Store } = require('./shopify/store');

const args = minimist(process.argv.slice(2));
const {
	_: [storeName, resource, csvPath],
	v: verbose,
	dry,
} = args;

if (_.isEmpty(storeName) || _.isEmpty(csvPath) || _.isEmpty(resource)) {
	console.log('npm run metaFromCsv <storeName> <resource> <pathToCsv> -- [options]');
	console.log('Example usage: npm run metaFromCsv store1 products metas.csv -- --dry -v');
	console.log('--dry         Dry run');
	console.log('-v            Verbose');
	console.log('-n            Namespaces to migrate');
	console.log('--handle      Product / Collection Handle');
	console.log('--handle2     Product / Collection Handle destination (same as above if not defined)');
	console.log('--id          Product / Collection Id (will take priority over handle)');
	console.log('--id2         Product / Collection Id destination (same as above if not defined, will take priority over handle)');
	process.exit();
}

const auth = _.get(config, storeName);

const read = async () => {
	const csv = fs.readFileSync(csvPath, { encoding: 'utf-8' });
	const json = Papa.parse(csv);

	const metas = {};
	const handles = json.data[0].slice(1);
	const datas = json.data.slice(1);
	handles.forEach((h) => { metas[h] = {}; });
	datas.forEach((d) => {
		const key = d[0];
		handles.forEach((h, i) => {
			metas[h][key] = d[i + 1];
		});
	});

	const store = new Store(storeName, auth.apiKey, auth.apiPass, auth.hostname, `files/${storeName}`);
	await store.metafields.getAllMetafields(resource);

	const handles2 = Object.keys(metas);
	for (let i = 0; i < handles2.length; i += 1) {
		const handle = handles2[i];
		const newMetas = [];
		Object.keys(metas[handle]).forEach((k) => {
			if (metas[handle][k] !== '') {
				newMetas.push({
					namespace: k.split('.')[0],
					key: k.split('.')[1],
					value: metas[handle][k],
					value_type: 'string',
				});
			}
		});

		store.metafields[resource][handle] = newMetas;
		await store.metafields.postMetafields({
			handle, resource, dry, verbose,
		});
	}
};

read();
