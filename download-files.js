const fs = require('fs');
const https = require('https');
const mkdirp = require('mkdirp');
const _ = require('lodash');

const args = process.argv.slice(2);
const pathToFile = args[0] || 'files/shopify-files-list.txt';
const downloadFolder = args[1] || 'files/downloads';
mkdirp.sync(downloadFolder);

const fileContent = fs.readFileSync(pathToFile, { encoding: 'utf-8' });
const links = fileContent.split(',');

const download = (url, filename) => {
	const resultPath = `${downloadFolder}/${filename}`;
	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(resultPath)
		.on('finish', () => {
			file.close();
			console.log('Download success:', filename);
			resolve();
		}).on('error', (err) => {
			fs.unlink(resultPath);
			console.log('File error:', err.message);
			reject();
		})

		console.log('Download start:', filename);
		https.get(url, (response) => {
			if (response.statusCode !== 200) {
				reject();
				return console.log('Request error: Response status was ' + response.statusCode);
			}
			response.pipe(file);
		}).on('error', (err) => {
			fs.unlink(resultPath);
			reject();
			return console.log('Request error:', err.message);
		});
	});
};

const downloadAll = async (links) => {
	for (let i = 0; i < links.length; i += 1) {
		const filename = _.last(links[i].split('?')[0].split('/'));
		await download(links[i], filename);
	}
}

downloadAll(links);
