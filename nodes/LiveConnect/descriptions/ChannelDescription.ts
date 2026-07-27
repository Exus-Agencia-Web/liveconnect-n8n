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
				description: 'List the channels configured in the account, with optional filters',
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
				displayName: 'Status',
				name: 'estado',
				type: 'number',
				default: 1,
				description: 'Channel status (default 1)',
				routing: { send: { type: 'query', property: 'estado' } },
			},
			{
				displayName: 'Channel ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filter by channel ID',
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
				description: 'Filter by startable channels',
				routing: { send: { type: 'query', property: 'iniciable' } },
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
				description: 'Filter by visibility',
				routing: { send: { type: 'query', property: 'visible' } },
			},
		],
	},
];
