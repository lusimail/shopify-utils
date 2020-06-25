# Shopify utility scripts

## Setup
1. `npm install`
2. In store admin panel, create private app and get the `API Key` and `API Password`
3. Duplicate `config/default.example.js` to `config/default.js` and fill your `API Key`, `API Password` and `hostname`

## Download images
1. Get all files link with [this script](https://gist.github.com/freakdesign/a1636414cce682c2c444#file-get-all-files-from-shopify-admin-js)
2. Put the .txt file in `files` folder
3. Run `npm run downloadFiles [path/filename.txt] [path/download/folder]`

## Copy discount code
This script will copy price rules that only have 1 discount codes.
Price rules that have more than 1 discount code is possibly created by an app.<br>
`Product Id`, `Variant Id` and `Collection Id` will be mapped to the new store's ids, but other settings will need to be set manually in the admin panel
1. In your private app, make sure you have these permissions: `read_products`, `write_products`, `read_price_rules`, `write_price_rules`, `read_discounts`, `write_discounts`
2. Run `npm run copyDiscounts <storeFrom> <storeTo>`. `<storeFrom>` and `<storeTo>` are the key you set in `config/default.js`. Example:
	```
	npm run copyDiscounts store1 store2
	```

## Analyze Shopify theme
To see how many files the theme have and which snippet or section files are not included / rendered.
Please note that snippets that are not rendered might be rendered from a liquid variable.<br>
Run `npm run analyzeTheme <path/to/theme>`. Example:
```
npm run analyzeTheme ~/shopify-theme
```

## Analyze Shopify theme file
To see approximately how the liquid file will be after injected with the `include`/`render`/`section`.
This will also output how many forloops are in the file.<br>
Run `npm run analyzeThemeFile <path/to/theme> <folder> <filenameToCompile>`. Example:
```
npm run analyzeThemeFile ~/shopify-theme layout theme.liquid
npm run analyzeThemeFile ~/shopify-theme templates/customers account.liquid
```

## Adjust theme settings for another store
In `settings_data.json`, sometimes there are `product Id`, `variant Id` or `collection Id`.
Duplicating theme to another store, will need adjustment on these ids.<br>
Run `npm run adjustThemeSettings <storeFrom> <storeTo> <settingFilePath>`. Example:
```
npm run adjustThemeSettings store1 store2  ~/shopify-theme/config/settings_data.json
```
