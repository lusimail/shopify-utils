const _ = require('lodash');
const { fetchData } = require('./helper');

class Blogs {
	constructor(store) {
		this.store = store;
	}

	async getAll(attrs = null) {
		this.items = await fetchData({
			prop: 'blogs', auth: this.store.getAuth(), folder: this.store.path, attrs,
		});
		return this.items;
	}

	async getBy(key, value) {
		if (_.isEmpty(this.items)) await this.getAll();
		return _.find(this.items, [key, value]);
	}
}

module.exports.Blogs = Blogs;
