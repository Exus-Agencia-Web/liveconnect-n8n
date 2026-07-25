import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const topicOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['topic'],
			},
		},
		options: [
			{
				name: 'Actualizar',
				value: 'update',
				action: 'Actualizar un t pico',
				description: 'Actualiza los campos de una memoria existente',
				routing: {
					request: { method: 'POST', url: '/assistant/edtTopic' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Crear',
				value: 'create',
				action: 'Crear un t pico',
				description: 'Crea un tópico (memoria) asociado a un asistente',
				routing: {
					request: { method: 'POST', url: '/assistant/addTopic' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Varios',
				value: 'getMany',
				action: 'Obtener varios t picos',
				description: 'Lista los tópicos (memorias) de los asistentes de la cuenta',
				routing: {
					request: { method: 'GET', url: '/assistant/listTopic' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const topicFields: INodeProperties[] = [
	// ----------------------------------
	//         topic: create
	// ----------------------------------
	{
		displayName: 'Nombre',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Nombre del tópico',
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['create'],
			},
		},
		routing: {
			send: { type: 'body', property: 'nombre' },
		},
	},
	{
		displayName: 'Campos Adicionales',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Detalles',
				name: 'detalles',
				type: 'string',
				default: '',
				description: 'Contenido de la memoria',
				routing: { send: { type: 'body', property: 'detalles' } },
			},
			{
				displayName: 'Grupo',
				name: 'grupo',
				type: 'string',
				default: '',
				description: 'Grupo del tópico',
				routing: { send: { type: 'body', property: 'grupo' } },
			},
			{
				displayName: 'ID del Asistente',
				name: 'id_assistant',
				type: 'number',
				default: 0,
				description: 'ID del asistente dueño del tópico',
				routing: { send: { type: 'body', property: 'id_assistant' } },
			},
		],
	},

	// ----------------------------------
	//         topic: getMany
	// ----------------------------------
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'ID del Asistente',
				name: 'id_assistant',
				type: 'number',
				default: 0,
				description: 'Filtra por asistente dueño del tópico',
				routing: { send: { type: 'query', property: 'id_assistant' } },
			},
			{
				displayName: 'ID del Tópico',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filtra por ID de tópico',
				routing: { send: { type: 'query', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         topic: update
	// ----------------------------------
	{
		displayName: 'ID del Tópico',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del tópico a editar',
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['update'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
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
				resource: ['topic'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Detalles',
				name: 'detalles',
				type: 'string',
				default: '',
				description: 'Contenido de la memoria',
				routing: { send: { type: 'body', property: 'detalles' } },
			},
			{
				displayName: 'Grupo',
				name: 'grupo',
				type: 'string',
				default: '',
				description: 'Grupo del tópico',
				routing: { send: { type: 'body', property: 'grupo' } },
			},
			{
				displayName: 'ID del Asistente',
				name: 'id_assistant',
				type: 'number',
				default: 0,
				description: 'ID del asistente dueño del tópico',
				routing: { send: { type: 'body', property: 'id_assistant' } },
			},
			{
				displayName: 'Nombre',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Nombre del tópico',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
		],
	},
];
