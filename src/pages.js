const _ = require('lodash');
const mkdirp = require('mkdirp');
const fs = require('fs');
const config = require('config');
const minimist = require('minimist');
const { apiPost } = require('./shopifyAdminApi');
const { fetchData } = require('./helper');

const args = minimist(process.argv.slice(2));
const {
	_: [storeFrom, storeTo],
	action,
	handle: pageHandle,
	handle2: pageHandleTo,
	id: pageId,
	id2: pageIdTo,
	v: verbose,
	dry,
	f: forceReplace,
} = args;

if (_.isEmpty(storeFrom) || (action === 'post' && _.isEmpty(storeTo))) {
	console.log('Example usage 1: npm run getPages <storeFrom>');
	console.log('Example usage 2: npm run postPages <storeFrom> <storeTo> -- [options]');
	console.log('--dry         Dry run');
	console.log('-f            Force update existing pages');
	console.log('-v            Verbose');
	// console.log('--handle      Product / Collection Handle');
	// console.log('--handle2     Product / Collection Handle destination (same as above if not defined)');
	// console.log('--id          Product / Collection Id (will take priority over handle)');
	// console.log('--id2         Product / Collection Id destination (same as above if not defined, will take priority over handle)');
	process.exit();
}

const authFrom = _.get(config, storeFrom);
const authTo = _.get(config, storeTo);

const data = {};

const getData = async () => {
	data.pagesFrom = await fetchData({ store: storeFrom, auth: authFrom, prop: 'pages' });
	if (!_.isEmpty(storeTo)) {
		data.pagesTo = await fetchData({ store: storeTo, auth: authTo, prop: 'pages' });
	}
};

const postPage = async (pageFrom) => {
	if (dry || verbose) {
		console.log(`To post: ${pageFrom.handle}`);
	}
	if (dry) return true;

	const newPage = {
		page: {
			title: pageFrom.title,
			handle: pageFrom.handle,
			body_html: pageFrom.body_html,
			author: pageFrom.author,
			template_suffix: pageFrom.template_suffix,
		},
	};
	const result = await apiPost(authTo, 'pages.json', newPage)
		// eslint-disable-next-line no-loop-func
		.then(() => {
			if (verbose) console.log(`Page created: ${pageFrom.handle}`);
			return true;
		// eslint-disable-next-line no-loop-func
		}).catch((err) => {
			console.log(`Page error: ${pageFrom.handle}`, JSON.stringify(err, null, 2));
			return false;
		});
	return result;
};

const doStuff = async () => {
	await getData();

	if (action === 'post') {
		if (dry || verbose) console.log(`Migrating ${data.pagesFrom.length} pages`);

		let create = 0;
		let exist = 0;
		let error = 0;
		for (let k = 0; k < data.pagesFrom.length; k += 1) {
			const from = data.pagesFrom[k];
			const to = _.find(data.pagesTo, { handle: from.handle });
			if (_.isEmpty(to)) {
				const result = await postPage(from);
				if (result) create += 1;
				else error += 1;
			} else {
				exist += 1;
				if (dry || verbose) console.log(`Page exist: ${from.handle}`);
				if (forceReplace) await postPage(from);
			}
		}
		console.log(`Result: ${exist} exist, ${create} create, ${error} error`);
	}
};

doStuff();
