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
				description: 'Get an account user by internal ID or by PageGear ID',
				routing: {
					request: { method: 'POST', url: '/users/get' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many users',
				description: 'List the users in the account, paginated and with optional filters',
				routing: {
					request: { method: 'GET', url: '/users/list' },
					output: { postReceive: [handleLcResponse] },
				},
			},
			{
				name: 'Set State',
				value: 'setState',
				action: 'Set the state of a user',
				description: 'Update the availability state of an account agent in real time',
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
		description: 'Identify the user by internal ID or by PageGear ID',
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
				routing: { send: { type: 'body', property: 'id_en_pge' } },
			},
			{
				displayName: 'User ID',
				name: 'id',
				type: 'string',
				default: '',
				description: 'Internal ID of the user (table lc_usuarios)',
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
				description: 'Registration date, from (filters fecha_add)',
				routing: { send: { type: 'query', property: 'desde' } },
			},
			{
				displayName: 'Created To',
				name: 'hasta',
				type: 'string',
				default: '',
				placeholder: 'YYYY-MM-DD',
				description: 'Registration date, to (filters fecha_add)',
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
				description: 'Pagination offset',
				routing: { send: { type: 'query', property: 'initFrom' } },
			},
			{
				displayName: 'Search',
				name: 'palabras',
				type: 'string',
				default: '',
				description: 'Search by name, phone number, or email (words separated by space or comma)',
				routing: { send: { type: 'query', property: 'palabras' } },
			},
			{
				displayName: 'State',
				name: 'estado',
				type: 'string',
				default: '',
				description: 'Filter by user state',
				routing: { send: { type: 'query', property: 'estado' } },
			},
			{
				displayName: 'Type',
				name: 'tipo',
				type: 'number',
				default: 0,
				description: 'Filter by user type',
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
		description: 'ID of the user/agent (table lc_usuarios)',
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
		description: 'Desired state of the agent',
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
