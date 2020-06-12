# Shopify utility scripts

## Setup
1. `npm install`
2. In store admin panel, create private app and get the `API Key` and `API Password`
3. Duplicate `config/default.example.js` to `config/default.js` and fill your `API Key`, `API Password` and `hostname`

### Download images
1. Get all files link with [this script](https://gist.github.com/freakdesign/a1636414cce682c2c444#file-get-all-files-from-shopify-admin-js)
2. Put the .txt file in `files` folder
3. Run `node download-files.js [path/filename.txt] [path/download/folder]`
