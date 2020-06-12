const axios = require('axios');
const _ = require('lodash');
const fs = require('fs');
const mkdirp = require('mkdirp');

const makeUrl = ({ apiKey, apiPass, hostname }, path) => `https://${apiKey}:${apiPass}@${hostname}/admin/api/2020-04/${path}`;

const apiGet = (auth, path, param = {}) => {
	const url = makeUrl(auth, path);
	return axios({ method: 'get', url, params: { ...param, limit: 250 } })
		.then((res) => res.data);
};

const apiPost = (auth, path, data = {}) => {
	const url = makeUrl(auth, path);
	return axios({ method: 'post', url, data })
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
module.exports.getWithMap = getWithMap;
module.exports.getToFile = getToFile;
