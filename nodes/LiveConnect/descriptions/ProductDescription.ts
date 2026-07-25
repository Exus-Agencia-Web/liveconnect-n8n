import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
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
				name: 'Actualizar',
				value: 'update',
				action: 'Actualizar un producto',
				description: 'Actualiza los campos enviados de un producto existente',
				routing: {
					request: { method: 'POST', url: '/catalogue/edtProduct' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Crear',
				value: 'create',
				action: 'Crear un producto',
				description: 'Agrega un producto al catálogo de la cuenta',
				routing: {
					request: { method: 'POST', url: '/catalogue/addProduct' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Varios',
				value: 'getMany',
				action: 'Obtener varios productos',
				description: 'Lista los productos del catálogo de la cuenta, opcionalmente filtrados por ID',
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
		displayName: 'Nombre',
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
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'ID del Producto',
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
		displayName: 'ID del Producto',
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
		displayName: 'Nombre',
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
		displayName: 'Campos a Actualizar',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Descripción',
				name: 'descripcion',
				type: 'string',
				default: '',
				description: 'Descripción del producto',
				routing: { send: { type: 'body', property: 'descripcion' } },
			},
			{
				displayName: 'Estado',
				name: 'estado',
				type: 'number',
				default: 0,
				description: 'Estado del producto',
				routing: { send: { type: 'body', property: 'estado' } },
			},
			{
				displayName: 'Fijado',
				name: 'fijar',
				type: 'number',
				default: 0,
				description: 'Fija el producto como destacado (1 = fijado, 0 = normal)',
				routing: { send: { type: 'body', property: 'fijar' } },
			},
			{
				displayName: 'Foto',
				name: 'foto',
				type: 'string',
				default: '',
				description: 'URL de la foto del producto',
				routing: { send: { type: 'body', property: 'foto' } },
			},
			{
				displayName: 'ID de la Categoría',
				name: 'id_categoria',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getCategories' },
				default: '',
				description:
					'ID de la categoría del producto. Elige de la lista o especifica un ID con una expresión.',
				routing: { send: { type: 'body', property: 'id_categoria' } },
			},
			{
				displayName: 'Nota',
				name: 'nota',
				type: 'string',
				default: '',
				description: 'Nota del producto',
				routing: { send: { type: 'body', property: 'nota' } },
			},
			{
				displayName: 'Referencia',
				name: 'referencia',
				type: 'string',
				default: '',
				description: 'Referencia del producto',
				routing: { send: { type: 'body', property: 'referencia' } },
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
				displayName: 'Valor',
				name: 'valor',
				type: 'string',
				default: '',
				description: 'Valor del producto',
				routing: { send: { type: 'body', property: 'valor' } },
			},
		],
	},
];
