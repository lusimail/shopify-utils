const _ = require('lodash');
const { apiPost, apiDelete, apiPut } = require('./adminApi');
const { fetchData } = require('./helper');

class Articles {
	constructor(store) {
		this.store = store;
		this.blogs = {};
		this.articles = [];
	}

	async getArticles(blogHandle) {
		const blog = await this.store.blogs.getBy('handle', blogHandle);
		if (_.isEmpty(blog)) throw new Error(`No Blog ${blogHandle}`);
		const articles = await fetchData({
			auth: this.store.getAuth(),
			folder: this.store.path,
			prop: 'articles',
			id: blog.id,
			handle: blog.handle,
		});
		this.blogs[blogHandle] = articles;
		return this.blogs[blogHandle];
	}

	async getAllArticles() {
		const blogs = await this.store.blogs.getAll();
		for (let i = 0; i < blogs.length; i += 1) {
			const blog = blogs[i];
			await this.getArticles(blog.handle);
		}
		return this.blogs;
	}

	async getAll() {
		const blogs = await this.getAllArticles();
		this.articles = _.flatten(_.values(blogs));
		return this.articles;
	}

	async getBy(key, value) {
		if (_.isEmpty(this.articles)) await this.getAll();
		return _.find(this.articles, [key, value]);
	}

	setArticles(blogHandle, articles) {
		this.blogs[blogHandle] = articles;
	}

	async deleteArticles({
		blogHandle, articles, dry, verbose,
	}) {
		const blog = await this.store.blogs.getBy('handle', blogHandle);
		if (_.isEmpty(blog)) throw new Error(`No Blog ${blogHandle}`);
		let deleted = 0;
		let error = 0;
		for (let i = 0; i < articles.length; i += 1) {
			const article = articles[i];
			if (dry || verbose) console.log(`To delete: ${article.handle}`);
			if (dry) {
				deleted += 1;
			} else {
				await apiDelete(this.store.getAuth(), `blogs/${blog.id}/articles/${article.id}.json`)
					// eslint-disable-next-line no-loop-func
					.then(() => {
						deleted += 1;
						if (verbose) console.log(`Article deleted: ${article.handle}`);
					// eslint-disable-next-line no-loop-func
					}).catch((err) => {
						error += 1;
						console.log(`Article error: ${article.handle}`, JSON.stringify(err, null, 2));
					});
			}
		}
		console.log(`blog ${blog.handle}: ${deleted} deleted, ${error} error`);
	}

	async postArticles({
		blogHandle, filter = [], exclude = [], dry, verbose, newArticles,
	}) {
		let oldArts = this.blogs[blogHandle];
		let newArts = newArticles || oldArts;
		if (!newArts) throw new Error(`Empty Articles: blog ${blogHandle}`);

		if (!_.isEmpty(filter)) {
			oldArts = _.filter(oldArts, (article) => _.includes(filter, article.id) || _.includes(filter, article.handle));
			newArts = _.filter(newArts, (article) => _.includes(filter, article.id) || _.includes(filter, article.handle));
		}
		if (!_.isEmpty(exclude)) {
			oldArts = _.filter(oldArts, (article) => !_.includes(exclude, article.id) && !_.includes(exclude, article.handle));
			newArts = _.filter(newArts, (article) => !_.includes(exclude, article.id) && !_.includes(exclude, article.handle));
		}

		if (_.isEmpty(oldArts) && _.isEmpty(newArts)) return;
		if (verbose) console.log(`Searching for blog ${blogHandle}`);
		const blog = await this.store.blogs.getBy('handle', blogHandle);
		if (_.isEmpty(blog)) {
			if (verbose) console.log(`${blogHandle} blog not found`);
			return;
		}

		let create = 0;
		let update = 0;
		let error = 0;
		for (let i = 0; i < newArts.length; i += 1) {
			const article = newArts[i];
			const oldArt = _.find(oldArts, (art) => art.handle === article.handle);
			const isUpdate = !_.isEmpty(oldArt);
			if (dry || verbose) console.log(`To ${isUpdate ? 'update' : 'create'}: ${article.handle}`);
			if (dry) {
				if (isUpdate) {
					update += 1;
				} else {
					create += 1;
				}
			} else {
				const newArticle = { article };
				if (isUpdate) {
					await apiPut(this.store.getAuth(), `blogs/${blog.id}/articles/${article.id}.json`, newArticle)
						// eslint-disable-next-line no-loop-func
						.then(() => {
							update += 1;
							if (verbose) console.log(`Article updated: ${article.handle}`);
						// eslint-disable-next-line no-loop-func
						}).catch((err) => {
							error += 1;
							console.log(`Article update error: ${article.handle}`, JSON.stringify(err, null, 2));
						});
				} else {
					await apiPost(this.store.getAuth(), `blogs/${blog.id}/articles.json`, newArticle)
						// eslint-disable-next-line no-loop-func
						.then(() => {
							create += 1;
							if (verbose) console.log(`Article created: ${article.handle}`);
						// eslint-disable-next-line no-loop-func
						}).catch((err) => {
							error += 1;
							console.log(`Article create error: ${article.handle}`, JSON.stringify(err, null, 2));
						});
				}
			}
		}
		console.log(`blog ${blogHandle}: ${create} create, ${update} update, ${error} error`);
	}

	async postAllArticles({
		filter = [], exclude = [], dry, verbose, newBlogs = this.blogs,
	}) {
		const handles = _.keys(this.blogs);
		for (let i = 0; i < handles.length; i += 1) {
			const blogHandle = handles[i];
			const newArticles = newBlogs[blogHandle];
			await this.postArticles({
				blogHandle,
				newArticles,
				filter,
				exclude,
				dry,
				verbose,
			});
		}
	}
}

module.exports.Articles = Articles;
