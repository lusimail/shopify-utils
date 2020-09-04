const fs = require('fs');
const axios = require('axios');
const mkdirp = require('mkdirp');
const _ = require('lodash');

const args = process.argv.slice(2);
const pathToFile = args[0] || 'files/shopify-files-list.txt';
const downloadFolder = args[1] || 'files/downloads';
const pathToFile2 = args[2] || '';

const fileContent = fs.readFileSync(pathToFile, { encoding: 'utf-8' });
const allLinks = fileContent.replace(/[\n ]/g, '').split(',');
let linksToDiff = [];

if (!_.isEmpty(pathToFile2) && fs.existsSync(pathToFile2)) {
	linksToDiff = fs.readFileSync(pathToFile2, { encoding: 'utf-8' }).split(',');
}

let downloadCount = 0;
let successCount = 0;
let errorCount = 0;
const download = (url, filename, batch) => {
	mkdirp.sync(`${downloadFolder}/${batch}`);
	const resultPath = `${downloadFolder}/${batch}/${filename}`;
	console.log('Download start:', filename);
	downloadCount += 1;
	return axios.get(url, { responseType: 'stream' })
		.then(response => {
			return new Promise((resolve, reject) => {
				const file = fs.createWriteStream(resultPath)
					.on('finish', () => {
						file.close();
						console.log('Download success:', filename);
						successCount += 1;
						resolve();
					}).on('error', (err) => {
						fs.unlink(resultPath);
						console.log('File error:', err.message);
						reject();
					});
				response.data.pipe(file);
			});
		})
		.catch(error => {
			errorCount += 1;
			console.log(error);
		});
};

const downloadAll = async (links, diffLinks = []) => {
	const diffFilenames = [];
	_.forEach(diffLinks, (link) => {
		diffFilenames.push(_.last(link.split('?')[0].split('/')));
	});
	let count = 0;
	for (let i = 0; i < links.length; i += 1) {
		const filename = _.last(links[i].split('?')[0].split('/'));
		if (_.includes(diffFilenames, filename)) {
			console.log(`${filename} already exist, not downloading`);
		} else {
			console.log(`File ${i}`);
			await download(links[i], filename, Math.floor(count / 100)); // eslint-disable-line no-await-in-loop
			count += 1;
		}
	}
	console.log('Total download:', downloadCount, 'files');
	console.log('Success download:', successCount, 'files');
	console.log('Error download:', errorCount, 'files');
};

console.log('To download:', allLinks.length, 'files');
if (!_.isEmpty(linksToDiff)) {
	console.log('To compare:', linksToDiff.length, 'files');
}

downloadAll(allLinks, linksToDiff);
