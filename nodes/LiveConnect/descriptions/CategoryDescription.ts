import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const categoryOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
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
				name: 'Actualizar',
				value: 'update',
				action: 'Actualizar una categoría',
				description: 'Actualiza los campos enviados de una categoría existente',
				routing: {
					request: { method: 'POST', url: '/catalogue/edtCategory' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Crear',
				value: 'create',
				action: 'Crear una categoría',
				description: 'Agrega una categoría al catálogo de la cuenta',
				routing: {
					request: { method: 'POST', url: '/catalogue/addCategory' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Varios',
				value: 'getMany',
				action: 'Obtener varias categorías',
				description: 'Lista las categorías del catálogo de la cuenta, opcionalmente filtradas por ID',
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
		displayName: 'Nombre',
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
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'ID de la Categoría',
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
		displayName: 'ID de la Categoría',
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
		displayName: 'Nombre',
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
		displayName: 'Campos a Actualizar',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['category'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Foto',
				name: 'foto',
				type: 'string',
				default: '',
				description: 'URL de la foto de la categoría',
				routing: { send: { type: 'body', property: 'foto' } },
			},
			{
				displayName: 'Orden',
				name: 'orden',
				type: 'number',
				default: 0,
				description: 'Orden de la categoría',
				routing: { send: { type: 'body', property: 'orden' } },
			},
		],
	},
];
