const _ = require('lodash');
const { fetchData } = require('./helper');

class Themes {
	constructor(store) {
		this.store = store;
	}

	async getAll() {
		this.items = await fetchData({
			prop: 'themes', auth: this.store.getAuth(), folder: this.store.path,
		});
		return this.items;
	}

	async getBy(key, value) {
		if (_.isEmpty(this.items)) await this.getAll();
		return _.find(this.items, [key, value]);
	}
}

module.exports.Themes = Themes;
