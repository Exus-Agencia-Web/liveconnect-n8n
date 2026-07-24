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
				name: 'Create',
				value: 'create',
				action: 'Create a category',
				description: 'Agrega una categoría al catálogo de la cuenta',
				routing: {
					request: { method: 'POST', url: '/catalogue/addCategory' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many categories',
				description: 'Lista las categorías del catálogo de la cuenta, opcionalmente filtradas por ID',
				routing: {
					request: { method: 'GET', url: '/catalogue/listCategories' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a category',
				description: 'Actualiza los campos enviados de una categoría existente',
				routing: {
					request: { method: 'POST', url: '/catalogue/edtCategory' },
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
		description: 'Nombre de la categoría',
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
				description: 'Filtra por ID de categoría',
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
		description: 'ID de la categoría a editar',
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
		description: 'Nombre de la categoría',
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
				displayName: 'Order',
				name: 'orden',
				type: 'number',
				default: 0,
				description: 'Orden de la categoría',
				routing: { send: { type: 'body', property: 'orden' } },
			},
			{
				displayName: 'Photo',
				name: 'foto',
				type: 'string',
				default: '',
				description: 'URL de la foto de la categoría',
				routing: { send: { type: 'body', property: 'foto' } },
			},
		],
	},
];
