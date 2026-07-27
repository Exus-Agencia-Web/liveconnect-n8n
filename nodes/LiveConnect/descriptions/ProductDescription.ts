import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['product'],
			},
		},
		options: [
			{
				name: 'Update',
				value: 'update',
				action: 'Update a product',
				description: 'Update the submitted fields of an existing product',
				routing: {
					request: { method: 'POST', url: '/catalogue/edtProduct' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a product',
				description: 'Add a product to the account catalog',
				routing: {
					request: { method: 'POST', url: '/catalogue/addProduct' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many products',
				description: 'List the products in the account catalog, optionally filtered by ID',
				routing: {
					request: { method: 'GET', url: '/catalogue/listProducts' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const productFields: INodeProperties[] = [
	// ----------------------------------
	//         product: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the product',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'nombre' },
		},
	},

	// ----------------------------------
	//         product: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Product ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filter by product ID',
				routing: { send: { type: 'query', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         product: update
	// ----------------------------------
	{
		displayName: 'Product ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID of the product to edit',
		displayOptions: {
			show: {
				resource: ['product'],
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
		description: 'Name of the product',
		displayOptions: {
			show: {
				resource: ['product'],
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
				resource: ['product'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'descripcion',
				type: 'string',
				default: '',
				description: 'Description of the product',
				routing: { send: { type: 'body', property: 'descripcion' } },
			},
			{
				displayName: 'Status',
				name: 'estado',
				type: 'number',
				default: 0,
				description: 'Status of the product',
				routing: { send: { type: 'body', property: 'estado' } },
			},
			{
				displayName: 'Pinned',
				name: 'fijar',
				type: 'number',
				default: 0,
				description: 'Pins the product as featured (1 = pinned, 0 = normal)',
				routing: { send: { type: 'body', property: 'fijar' } },
			},
			{
				displayName: 'Photo',
				name: 'foto',
				type: 'string',
				default: '',
				description: 'URL of the product photo',
				routing: { send: { type: 'body', property: 'foto' } },
			},
			{
				displayName: 'Category Name or ID',
				name: 'id_categoria',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getCategories' },
				default: '',
				description:
					'ID of the product category. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				routing: { send: { type: 'body', property: 'id_categoria' } },
			},
			{
				displayName: 'Note',
				name: 'nota',
				type: 'string',
				default: '',
				description: 'Note of the product',
				routing: { send: { type: 'body', property: 'nota' } },
			},
			{
				displayName: 'Reference',
				name: 'referencia',
				type: 'string',
				default: '',
				description: 'Reference of the product',
				routing: { send: { type: 'body', property: 'referencia' } },
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL of the product',
				routing: { send: { type: 'body', property: 'url' } },
			},
			{
				displayName: 'Value',
				name: 'valor',
				type: 'string',
				default: '',
				description: 'Value of the product',
				routing: { send: { type: 'body', property: 'valor' } },
			},
		],
	},
];
