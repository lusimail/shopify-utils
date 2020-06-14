module.exports = {
	root: true,
	extends: ['airbnb-base'],
	globals: {
		__DEV__: true,
	},
	rules: {
		indent: [
			2,
			'tab',
			{
				SwitchCase: 1,
				VariableDeclarator: 1,
			},
		],
		'no-tabs': 0,
		'max-len': [
			2,
			{
				code: 120,
				tabWidth: 1,
				ignoreComments: true,
				ignoreTrailingComments: true,
				ignoreUrls: true,
				ignoreStrings: true,
				ignoreTemplateLiterals: true,
				ignoreRegExpLiterals: true,
			},
		],
		'arrow-parens': 0,
		'import/prefer-default-export': 0,
		quotes: [2, 'single', 'avoid-escape'],
		'import/no-dynamic-require': 0,
		'global-require': 0,
		camelcase: 0,
		'arrow-body-style': 1,
		'class-methods-use-this': 0,
	},
};
