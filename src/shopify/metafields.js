const _ = require('lodash');
const { apiPost } = require('./adminApi');
const { fetchData } = require('./helper');

const validResources = [
	'products',
	'collections',
	'articles',
];

class Metafields {
	constructor(store) {
		this.store = store;
	}

	async getMetafields(resource, _item, itemBy) {
		if (!_.includes(validResources, resource)) throw new Error(`Invalid Resource: ${resource}`);
		let item = _item;
		if (!_.isEmpty(itemBy)) {
			item = await this.store[resource].getBy(itemBy, _item);
		}
		if (_.isEmpty(item)) throw new Error('Empty Resource');
		this[resource] = this[resource] || {};
		const metas = await fetchData({
			auth: this.store.getAuth(),
			folder: this.store.path,
			prop: `${resource}Metafield`,
			id: item.id,
			handle: item.handle,
		});
		this[resource][item.handle] = metas;
		return this[resource][item.handle];
	}

	async getAllMetafields(resource) {
		if (!_.includes(validResources, resource)) throw new Error(`Invalid Resource: ${resource}`);
		const resources = await this.store[resource].getAll();
		for (let i = 0; i < resources.length; i += 1) {
			const item = resources[i];
			await this.getMetafields(resource, item);
		}
		return this[resource];
	}

	setMetafields(resource, metas) {
		if (!_.includes(validResources, resource)) throw new Error(`Invalid Resource: ${resource}`);
		console.log(`Setting metafields for ${this.store.name} ${resource}`);
		this[resource] = metas;
	}

	async postMetafields({
		resource, handle, filter = [], exclude = [], dry, verbose,
	}) {
		if (!_.includes(validResources, resource)) throw new Error(`Invalid Resource: ${resource}`);

		let filtered = this[resource][handle];
		if (!filtered) throw new Error(`Empty Metafields: ${resource}, ${handle}`);

		if (!_.isEmpty(filter)) {
			filtered = _.filter(filtered, (meta) => _.includes(filter, meta.namespace) || _.includes(filter, `${meta.namespace}.${meta.key}`));
		}
		if (!_.isEmpty(exclude)) {
			filtered = _.filter(filtered, (meta) => !_.includes(exclude, meta.namespace) && !_.includes(exclude, `${meta.namespace}.${meta.key}`));
		}

		if (_.isEmpty(filtered)) return;
		if (verbose) console.log(`Searching for ${handle}`);
		const item = await this.store[resource].getBy('handle', handle);
		if (_.isEmpty(item)) {
			if (verbose) console.log(`${handle} item not found`);
			return;
		}

		let create = 0;
		let error = 0;
		for (let i = 0; i < filtered.length; i += 1) {
			const meta = filtered[i];
			if (dry || verbose) console.log(`To post: ${meta.namespace}.${meta.key}`);
			if (dry) {
				create += 1;
			} else {
				const newMeta = {
					metafield: {
						namespace: meta.namespace,
						key: meta.key,
						value: meta.value,
						value_type: meta.value_type,
					},
				};
				await apiPost(this.store.getAuth(), `${resource}/${item.id}/metafields.json`, newMeta)
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
		console.log(`${resource} ${handle}: ${create} create, ${error} error`);
	}

	async postAllMetafields({
		resource, filter = [], exclude = [], dry, verbose,
	}) {
		if (!_.includes(validResources, resource)) throw new Error(`Invalid Resource: ${resource}`);
		const handles = _.keys(this[resource]);
		for (let i = 0; i < handles.length; i += 1) {
			await this.postMetafields({
				resource,
				handle: handles[i],
				filter,
				exclude,
				dry,
				verbose,
			});
		}
	}
}

module.exports.Metafields = Metafields;
