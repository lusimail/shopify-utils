const _ = require('lodash');
const mkdirp = require('mkdirp');
const config = require('config');
const minimist = require('minimist');
const { fetchData } = require('./helper');

const args = minimist(process.argv.slice(2));
const {
	s: stores,
	p: props,
} = args;

if (!stores || _.isEmpty(stores) || !props || _.isEmpty(props)) {
	console.log('Example usage: npm run getStoreData -- -s <store> -p <prop>');
	console.log('-s            Store');
	console.log('-p            Properties [products, collections, pages]');
	process.exit();
}

mkdirp.sync('files');

const getData = async (store, prop) => {
	const auth = _.get(config, store);
	if (_.isEmpty(auth)) {
		console.log(`No auth data for ${store}`);
		return;
	}
	await fetchData({
		store, auth, prop, forceFetch: true,
	});
};

const getStoreData = async (store) => {
	if (_.isArray(props)) {
		_.forEach(props, (prop) => {
			getData(store, prop);
		});
	} else {
		getData(store, props);
	}
};

if (_.isArray(stores)) {
	_.forEach(stores, (store) => {
		getStoreData(store);
	});
} else {
	getStoreData(stores);
}
