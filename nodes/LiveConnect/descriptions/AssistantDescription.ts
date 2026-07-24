import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const assistantOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['assistant'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an assistant',
				description: 'Crea un asistente de IA en la cuenta',
				routing: {
					request: { method: 'POST', url: '/assistant/addAssistant' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many assistants',
				description: 'Lista los asistentes de IA de la cuenta, opcionalmente filtrados por ID',
				routing: {
					request: { method: 'GET', url: '/assistant/listAssistant' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an assistant',
				description: 'Actualiza el nombre y/o las reglas de un asistente existente',
				routing: {
					request: { method: 'POST', url: '/assistant/edtAssistant' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const assistantFields: INodeProperties[] = [
	// ----------------------------------
	//         assistant: create
	// ----------------------------------
	{
		displayName: 'Name',
		name: 'nombre',
		type: 'string',
		required: true,
		default: '',
		description: 'Nombre del asistente',
		displayOptions: {
			show: {
				resource: ['assistant'],
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
				resource: ['assistant'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Brain Template ID',
				name: 'brainSelected',
				type: 'number',
				default: 0,
				description: 'ID de la plantilla de cerebro a aplicar como reglas iniciales',
				routing: { send: { type: 'body', property: 'brainSelected' } },
			},
			{
				displayName: 'Memory',
				name: 'memory',
				type: 'json',
				default: '{}',
				description: 'Memoria inicial a asignar (ignorada cuando el tipo es Skip Initial Memory)',
				routing: {
					send: {
						type: 'body',
						property: 'memory',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Standard', value: 0 },
					{ name: 'Skip Initial Memory', value: 1 },
				],
				default: 0,
				description:
					'Tipo de creación del asistente. Skip Initial Memory fuerza la creación sin asignar memorias iniciales.',
				routing: { send: { type: 'body', property: 'type' } },
			},
		],
	},

	// ----------------------------------
	//         assistant: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['assistant'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Assistant ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filtra por ID de asistente',
				routing: { send: { type: 'query', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         assistant: update
	// ----------------------------------
	{
		displayName: 'Assistant ID',
		name: 'id',
		type: 'number',
		required: true,
		default: 0,
		description: 'ID del asistente a editar',
		displayOptions: {
			show: {
				resource: ['assistant'],
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
				resource: ['assistant'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Nombre del asistente',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Rules',
				name: 'reglas',
				type: 'json',
				default: '{}',
				description: 'Configuración/reglas del asistente',
				routing: {
					send: {
						type: 'body',
						property: 'reglas',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
		],
	},
];
