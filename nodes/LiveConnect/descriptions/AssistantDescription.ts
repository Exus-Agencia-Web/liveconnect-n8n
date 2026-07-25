import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const assistantOperations: INodeProperties[] = [
	{
		displayName: 'Operación',
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
				name: 'Actualizar',
				value: 'update',
				action: 'Actualizar un asistente',
				description: 'Actualiza el nombre y/o las reglas de un asistente existente',
				routing: {
					request: { method: 'POST', url: '/assistant/edtAssistant' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Crear',
				value: 'create',
				action: 'Crear un asistente',
				description: 'Crea un asistente de IA en la cuenta',
				routing: {
					request: { method: 'POST', url: '/assistant/addAssistant' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Obtener Varios',
				value: 'getMany',
				action: 'Obtener varios asistentes',
				description: 'Lista los asistentes de IA de la cuenta, opcionalmente filtrados por ID',
				routing: {
					request: { method: 'GET', url: '/assistant/listAssistant' },
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
		displayName: 'Nombre',
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
		displayName: 'Campos Adicionales',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['assistant'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'ID de la Plantilla de Cerebro',
				name: 'brainSelected',
				type: 'number',
				default: 0,
				description: 'ID de la plantilla de cerebro a aplicar como reglas iniciales',
				routing: { send: { type: 'body', property: 'brainSelected' } },
			},
			{
				displayName: 'Memoria',
				name: 'memory',
				type: 'json',
				default: '{}',
				description: 'Memoria inicial a asignar (ignorada cuando el tipo es Omitir Memoria Inicial)',
				routing: {
					send: {
						type: 'body',
						property: 'memory',
						value: '={{ typeof $value === "object" && $value !== null ? $value : JSON.parse($value || "{}") }}',
					},
				},
			},
			{
				displayName: 'Tipo',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Estándar', value: 0 },
					{ name: 'Omitir Memoria Inicial', value: 1 },
				],
				default: 0,
				description:
					'Tipo de creación del asistente. Omitir Memoria Inicial fuerza la creación sin asignar memorias iniciales.',
				routing: { send: { type: 'body', property: 'type' } },
			},
		],
	},

	// ----------------------------------
	//         assistant: getMany
	// ----------------------------------
	{
		displayName: 'Filtros',
		name: 'filters',
		type: 'collection',
		placeholder: 'Agregar Filtro',
		default: {},
		displayOptions: {
			show: {
				resource: ['assistant'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'ID del Asistente',
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
		displayName: 'ID del Asistente',
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
		displayName: 'Campos a Actualizar',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Agregar Campo',
		default: {},
		displayOptions: {
			show: {
				resource: ['assistant'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Nombre',
				name: 'nombre',
				type: 'string',
				default: '',
				description: 'Nombre del asistente',
				routing: { send: { type: 'body', property: 'nombre' } },
			},
			{
				displayName: 'Reglas',
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
