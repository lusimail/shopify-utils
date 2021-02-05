const _ = require('lodash');
const { apiPost } = require('./adminApi');
const { fetchData } = require('./helper');

class Redirects {
	constructor(store) {
		this.store = store;
	}

	async getAll(attrs = null) {
		this.items = await fetchData({
			prop: 'redirects', auth: this.store.getAuth(), folder: this.store.path, attrs,
		});
		return this.items;
	}

	async getBy(key, value) {
		if (_.isEmpty(this.items)) await this.getAll();
		return _.find(this.items, [key, value]);
	}

	async create({
		path, target, verbose,
	}) {
		await apiPost(this.store.getAuth(), 'redirects.json', { redirect: { path, target } })
			// eslint-disable-next-line no-loop-func
			.then(() => {
				if (verbose) console.log(`Redirect created: ${path} ${target}`);
			// eslint-disable-next-line no-loop-func
			}).catch((err) => {
				console.log(`Redirect error: ${path} ${target}`, JSON.stringify(err, null, 2));
			});
	}
}

module.exports.Redirects = Redirects;
