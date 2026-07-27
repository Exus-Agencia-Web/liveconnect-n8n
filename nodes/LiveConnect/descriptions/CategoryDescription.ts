import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const categoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['category'],
			},
		},
		options: [
			{
				name: 'Update',
				value: 'update',
				action: 'Update a category',
				description: 'Update the sent fields of an existing category',
				routing: {
					request: { method: 'POST', url: '/catalogue/edtCategory' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a category',
				description: 'Add a category to the account catalog',
				routing: {
					request: { method: 'POST', url: '/catalogue/addCategory' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many categories',
				description: 'List the categories in the account catalog, optionally filtered by ID',
				routing: {
					request: { method: 'GET', url: '/catalogue/listCategories' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const categoryFields: INodeProperties[] = [
	// ----------------------------------
	//         category: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the category',
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'nombre' },
		},
	},

	// ----------------------------------
	//         category: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Category ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filter by category ID',
				routing: { send: { type: 'query', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         category: update
	// ----------------------------------
	{
		displayName: 'Category ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID of the category to edit',
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['update'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
		},
	},
	{
		displayName: 'Name',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the category',
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['update'],
			},
		},
		routing: {
			send: { type: 'body', property: 'nombre' },
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Photo',
				name: 'foto',
				type: 'string',
				default: '',
				description: 'URL of the category photo',
				routing: { send: { type: 'body', property: 'foto' } },
			},
			{
				displayName: 'Order',
				name: 'orden',
				type: 'number',
				default: 0,
				description: 'Order of the category',
				routing: { send: { type: 'body', property: 'orden' } },
			},
		],
	},
];
