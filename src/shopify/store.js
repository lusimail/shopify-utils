const { Products } = require('./products');
const { Collections } = require('./collections');
const { Metafields } = require('./metafields');

class Store {
	constructor(name, apiKey, apiPass, hostname, path) {
		this.name = name;
		this.apiKey = apiKey;
		this.apiPass = apiPass;
		this.hostname = hostname;
		this.path = path;

		this.products = new Products(this);
		this.collections = new Collections(this);
		this.metafields = new Metafields(this);
	}

	getAuth() {
		return { apiKey: this.apiKey, apiPass: this.apiPass, hostname: this.hostname };
	}
}

module.exports.Store = Store;
