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
				name: 'Create',
				value: 'create',
				action: 'Create a product',
				description: 'Agrega un producto al catálogo de la cuenta',
				routing: {
					request: { method: 'POST', url: '/catalogue/addProduct' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many products',
				description: 'Lista los productos del catálogo de la cuenta, opcionalmente filtrados por ID',
				routing: {
					request: { method: 'GET', url: '/catalogue/listProducts' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a product',
				description: 'Actualiza los campos enviados de un producto existente',
				routing: {
					request: { method: 'POST', url: '/catalogue/edtProduct' },
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
		description: 'Nombre del producto',
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
				description: 'Filtra por ID de producto',
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
		description: 'ID del producto a editar',
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
		description: 'Nombre del producto',
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
				displayName: 'Category ID',
				name: 'id_categoria',
				type: 'number',
				default: 0,
				description: 'ID de la categoría del producto',
				routing: { send: { type: 'body', property: 'id_categoria' } },
			},
			{
				displayName: 'Description',
				name: 'descripcion',
				type: 'string',
				default: '',
				description: 'Descripción del producto',
				routing: { send: { type: 'body', property: 'descripcion' } },
			},
			{
				displayName: 'Note',
				name: 'nota',
				type: 'string',
				default: '',
				description: 'Nota del producto',
				routing: { send: { type: 'body', property: 'nota' } },
			},
			{
				displayName: 'Photo',
				name: 'foto',
				type: 'string',
				default: '',
				description: 'URL de la foto del producto',
				routing: { send: { type: 'body', property: 'foto' } },
			},
			{
				displayName: 'Pinned',
				name: 'fijar',
				type: 'number',
				default: 0,
				description: 'Fija el producto como destacado (1 = fijado, 0 = normal)',
				routing: { send: { type: 'body', property: 'fijar' } },
			},
			{
				displayName: 'Reference',
				name: 'referencia',
				type: 'string',
				default: '',
				description: 'Referencia del producto',
				routing: { send: { type: 'body', property: 'referencia' } },
			},
			{
				displayName: 'Status',
				name: 'estado',
				type: 'number',
				default: 0,
				description: 'Estado del producto',
				routing: { send: { type: 'body', property: 'estado' } },
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL del producto',
				routing: { send: { type: 'body', property: 'url' } },
			},
			{
				displayName: 'Value',
				name: 'valor',
				type: 'string',
				default: '',
				description: 'Valor del producto',
				routing: { send: { type: 'body', property: 'valor' } },
			},
		],
	},
];
