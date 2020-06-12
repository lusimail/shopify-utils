# Shopify utility scripts

## Setup
1. `npm install`
2. In store admin panel, create private app and get the `API Key` and `API Password`
3. Duplicate `config/default.example.js` to `config/default.js` and fill your `API Key`, `API Password` and `hostname`

### Download images
1. Get all files link with [this script](https://gist.github.com/freakdesign/a1636414cce682c2c444#file-get-all-files-from-shopify-admin-js)
2. Put the .txt file in `files` folder
3. Run `npm run downloadFiles [path/filename.txt] [path/download/folder]`

### Copy discount code
This script will copy price rules that only have 1 discount codes.
Price rules that have more than 1 discount code is possibly created by an app.<br>
`Product Id`, `Variant Id` and `Collection Id` will be mapped to the new store's ids, but other settings will need to be set manually in the admin panel
1. In your private app, make sure you have these permissions: `read_products`, `write_products`, `read_price_rules`, `write_price_rules`, `read_discounts`, `write_discounts`
2. Run `npm run copyDiscounts <storeFrom> <storeTo>`
