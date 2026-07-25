/**
 * ESLint config for n8n community nodes (eslint-plugin-n8n-nodes-base).
 */
module.exports = {
	root: true,

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	parser: '@typescript-eslint/parser',

	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},

	ignorePatterns: ['.eslintrc.js', '**/*.js', '**/node_modules/**', '**/dist/**'],

	overrides: [
		{
			files: ['package.json'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/community'],
			rules: {
				'n8n-nodes-base/community-package-json-name-still-default': 'off',
			},
		},
		{
			files: ['./credentials/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/credentials'],
			rules: {
				'n8n-nodes-base/cred-class-field-documentation-url-missing': 'off',
				'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
			},
		},
		{
			files: ['./nodes/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/nodes'],
			rules: {
				'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
				'n8n-nodes-base/node-resource-description-filename-against-convention': 'off',
				'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
				// UI del nodo en ESPAÑOL: se desactivan las reglas que exigen
				// literales de texto en inglés (la estructura sigue validada).
				'n8n-nodes-base/node-param-description-boolean-without-whether': 'off',
				'n8n-nodes-base/node-param-display-name-wrong-for-simplify': 'off',
				'n8n-nodes-base/node-param-description-wrong-for-simplify': 'off',
				'n8n-nodes-base/node-param-option-name-wrong-for-get-many': 'off',
				'n8n-nodes-base/node-param-description-wrong-for-limit': 'off',
				'n8n-nodes-base/node-param-display-name-wrong-for-update-fields': 'off',
				'n8n-nodes-base/node-param-description-wrong-for-dynamic-options': 'off',
				'n8n-nodes-base/node-param-description-line-break-html-tag': 'off',
				// El Title Case inglés capitaliza preposiciones españolas ("ID Del Canal"):
				// en español los labels usan "ID del Canal" — regla incompatible.
				'n8n-nodes-base/node-param-display-name-miscased': 'off',
				'n8n-nodes-base/node-param-option-name-containing-star': 'off',
			},
		},
	],
};
