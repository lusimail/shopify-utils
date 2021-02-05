const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');
const mkdirp = require('mkdirp');

const makeUrl = ({ apiKey, apiPass, hostname }, path) => `https://${apiKey}:${apiPass}@${hostname}/admin/api/2020-07/${path}`;

const getNextPage = (prevData, url, link) => {
	if (!_.includes(link, 'rel="next"')) return prevData;
	const page_info = _.last(link.match(/(?<=page_info=)[^&>]*/g));
	return axios({ method: 'get', url, params: { page_info, limit: 250 } })
		.then((res) => {
			const newData = prevData;
			_.forEach(res.data, (v, k) => { newData[k] = _.concat(newData[k], res.data[k]); });
			if (res.headers.link !== undefined) {
				return getNextPage(newData, url, res.headers.link);
			}
			return newData;
		});
};

const apiGet = (auth, path, param = {}) => {
	const url = makeUrl(auth, path);
	return axios({ method: 'get', url, params: { ...param, limit: 250 } })
		.then((res) => {
			if (res.headers.link !== undefined) {
				return getNextPage(res.data, url, res.headers.link);
			}
			return res.data;
		});
};

const apiPost = (auth, path, data = {}) => {
	const url = makeUrl(auth, path);
	return axios({ method: 'post', url, data })
		.then((res) => res.data);
};

const apiPut = (auth, path, data = {}) => {
	const url = makeUrl(auth, path);
	return axios({ method: 'put', url, data })
		.then((res) => res.data);
};

const apiDelete = (auth, path) => {
	const url = makeUrl(auth, path);
	return axios({ method: 'delete', url })
		.then((res) => res.data);
};

const mapObj = (obj, props = []) => {
	const newObj = {};
	_.forEach(props, prop => {
		if (_.isArray(prop)) {
			newObj[prop[0]] = _.map(obj[prop[0]], (item) => mapObj(item, prop[1]));
		} else {
			newObj[prop] = obj[prop];
		}
	});
	return newObj;
};

const getWithMap = (auth, path, param, prop = '', attrs = []) => apiGet(auth, path, param)
	.then((data) => {
		const result = _.isEmpty(prop) ? data : data[prop];
		if (_.isEmpty(attrs)) {
			return result;
		}
		const mapped = _.map(result, (item) => mapObj(item, attrs));
		return mapped;
	});

const getToFile = (auth, path, param, prop, attrs, filePath) => getWithMap(auth, path, param, prop, attrs)
	.then((result) => {
		mkdirp.sync(filePath.split('/').slice(0, -1).join('/'));
		fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
		return result;
	});

module.exports.apiGet = apiGet;
module.exports.apiPost = apiPost;
module.exports.apiDelete = apiDelete;
module.exports.apiPut = apiPut;
module.exports.getWithMap = getWithMap;
module.exports.getToFile = getToFile;
