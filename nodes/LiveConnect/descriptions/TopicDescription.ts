import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const topicOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
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
				name: 'Create',
				value: 'create',
				action: 'Create a topic',
				description: 'Crea un tópico (memoria) asociado a un asistente',
				routing: {
					request: { method: 'POST', url: '/assistant/addTopic' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many topics',
				description: 'Lista los tópicos (memorias) de los asistentes de la cuenta',
				routing: {
					request: { method: 'GET', url: '/assistant/listTopic' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a topic',
				description: 'Actualiza los campos de una memoria existente',
				routing: {
					request: { method: 'POST', url: '/assistant/edtTopic' },
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
		displayName: 'Name',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Assistant ID',
				name: 'id_assistant',
				type: 'number',
				default: 0,
				description: 'ID del asistente dueño del tópico',
				routing: { send: { type: 'body', property: 'id_assistant' } },
			},
			{
				displayName: 'Details',
				name: 'detalles',
				type: 'string',
				default: '',
				description: 'Contenido de la memoria',
				routing: { send: { type: 'body', property: 'detalles' } },
			},
			{
				displayName: 'Group',
				name: 'grupo',
				type: 'string',
				default: '',
				description: 'Grupo del tópico',
				routing: { send: { type: 'body', property: 'grupo' } },
			},
		],
	},

	// ----------------------------------
	//         topic: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Assistant ID',
				name: 'id_assistant',
				type: 'number',
				default: 0,
				description: 'Filtra por asistente dueño del tópico',
				routing: { send: { type: 'query', property: 'id_assistant' } },
			},
			{
				displayName: 'Topic ID',
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
		displayName: 'Topic ID',
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['topic'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Assistant ID',
				name: 'id_assistant',
				type: 'number',
				default: 0,
				description: 'ID del asistente dueño del tópico',
				routing: { send: { type: 'body', property: 'id_assistant' } },
			},
			{
				displayName: 'Details',
				name: 'detalles',
				type: 'string',
				default: '',
				description: 'Contenido de la memoria',
				routing: { send: { type: 'body', property: 'detalles' } },
			},
			{
				displayName: 'Group',
				name: 'grupo',
				type: 'string',
				default: '',
				description: 'Grupo del tópico',
				routing: { send: { type: 'body', property: 'grupo' } },
			},
			{
				displayName: 'Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Nombre del tópico',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
		],
	},
];
