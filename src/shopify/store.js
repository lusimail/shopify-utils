const { Themes } = require('./themes');
const { Products } = require('./products');
const { Collections } = require('./collections');
const { Blogs } = require('./blogs');
const { Articles } = require('./articles');
const { Redirects } = require('./redirects');
const { Metafields } = require('./metafields');
const { Pages } = require('./pages');

class Store {
	constructor(name, apiKey, apiPass, hostname, path) {
		this.name = name;
		this.apiKey = apiKey;
		this.apiPass = apiPass;
		this.hostname = hostname;
		this.path = path;

		this.themes = new Themes(this);
		this.products = new Products(this);
		this.collections = new Collections(this);
		this.blogs = new Blogs(this);
		this.articles = new Articles(this);
		this.redirects = new Redirects(this);
		this.metafields = new Metafields(this);
		this.pages = new Pages(this);
	}

	getAuth() {
		return { apiKey: this.apiKey, apiPass: this.apiPass, hostname: this.hostname };
	}
}

module.exports.Store = Store;
