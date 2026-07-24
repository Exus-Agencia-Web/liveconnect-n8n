import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const userOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a user',
				description: 'Obtiene un usuario de la cuenta por ID interno o por ID en PageGear',
				routing: {
					request: { method: 'POST', url: '/users/get' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many users',
				description: 'Lista los usuarios de la cuenta, paginados y con filtros opcionales',
				routing: {
					request: { method: 'GET', url: '/users/list' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Set State',
				value: 'setState',
				action: 'Set the state of a user',
				description: 'Actualiza en tiempo real el estado de disponibilidad de un agente de la cuenta',
				routing: {
					request: { method: 'POST', url: '/users/setState' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const userFields: INodeProperties[] = [
	// ----------------------------------
	//         user: get
	// ----------------------------------
	{
		displayName: 'Search Fields',
		name: 'searchFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Identifica al usuario por su ID interno o por su ID en PageGear',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['get'],
			},
		},
		options: [
			{
				displayName: 'PageGear User ID',
				name: 'id_en_pge',
				type: 'string',
				default: '',
				description: 'ID del usuario en PageGear',
				routing: { send: { type: 'body', property: 'id_en_pge' } },
			},
			{
				displayName: 'User ID',
				name: 'id',
				type: 'string',
				default: '',
				description: 'ID interno del usuario (tabla lc_usuarios)',
				routing: { send: { type: 'body', property: 'id' } },
			},
		],
	},

	// ----------------------------------
	//         user: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Created From',
				name: 'desde',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha de alta, desde (filtra fecha_add)',
				routing: { send: { type: 'query', property: 'desde' } },
			},
			{
				displayName: 'Created To',
				name: 'hasta',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Fecha de alta, hasta (filtra fecha_add)',
				routing: { send: { type: 'query', property: 'hasta' } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				routing: { send: { type: 'query', property: 'limit' } },
			},
			{
				displayName: 'Offset',
				name: 'initFrom',
				type: 'number',
				default: 0,
				description: 'Offset de paginación',
				routing: { send: { type: 'query', property: 'initFrom' } },
			},
			{
				displayName: 'Search',
				name: 'palabras',
				type: 'string',
				default: '',
				description: 'Búsqueda por nombre, celular o email (palabras separadas por espacio o coma)',
				routing: { send: { type: 'query', property: 'palabras' } },
			},
			{
				displayName: 'State',
				name: 'estado',
				type: 'string',
				default: '',
				description: 'Filtra por estado del usuario',
				routing: { send: { type: 'query', property: 'estado' } },
			},
			{
				displayName: 'Type',
				name: 'tipo',
				type: 'number',
				default: 0,
				description: 'Filtra por tipo de usuario',
				routing: { send: { type: 'query', property: 'tipo' } },
			},
		],
	},

	// ----------------------------------
	//         user: setState
	// ----------------------------------
	{
		displayName: 'User ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		description: 'ID del usuario/agente (tabla lc_usuarios)',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['setState'],
			},
		},
		routing: {
			send: { type: 'body', property: 'id' },
		},
	},
	{
		displayName: 'State',
		name: 'state',
		type: 'options',
		required: true,
		options: [
			{ name: 'Absent', value: 'absent' },
			{ name: 'Automatic', value: 'automatic' },
			{ name: 'Connected', value: 'connected' },
			{ name: 'Disconnected', value: 'disconnected' },
			{ name: 'Disconnected (Legacy)', value: 'desconnected' },
			{ name: 'Do Not Disturb', value: 'not_disturb' },
		],
		default: 'connected',
		description: 'Estado deseado del agente',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['setState'],
			},
		},
		routing: {
			send: { type: 'body', property: 'state' },
		},
	},
];
