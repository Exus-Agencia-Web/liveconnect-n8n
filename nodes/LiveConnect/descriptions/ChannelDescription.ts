import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const channelOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['channel'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many channels',
				description: 'Lista los canales configurados en la cuenta, con filtros opcionales',
				routing: {
					request: { method: 'GET', url: '/channels/list' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const channelFields: INodeProperties[] = [
	// ----------------------------------
	//         channel: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['channel'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Channel ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filtra por ID de canal',
				routing: { send: { type: 'query', property: 'id' } },
			},
			{
				displayName: 'Startable',
				name: 'iniciable',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Yes', value: 1 },
				],
				default: 1,
				description: 'Filtra por canales iniciables',
				routing: { send: { type: 'query', property: 'iniciable' } },
			},
			{
				displayName: 'State',
				name: 'estado',
				type: 'number',
				default: 1,
				description: 'Estado del canal (default 1)',
				routing: { send: { type: 'query', property: 'estado' } },
			},
			{
				displayName: 'Visible',
				name: 'visible',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Yes', value: 1 },
				],
				default: 1,
				description: 'Filtra por visibilidad',
				routing: { send: { type: 'query', property: 'visible' } },
			},
		],
	},
];
