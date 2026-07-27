import type { INodeProperties } from 'n8n-workflow';

import { handleLcResponse } from '../GenericFunctions';

export const groupOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['group'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many teams',
				description: 'List the agent teams configured in the account, with optional filters',
				routing: {
					request: { method: 'GET', url: '/groups/list' },
					output: { postReceive: [handleLcResponse] },
				},
			},
		],
		default: 'getMany',
	},
];

export const groupFields: INodeProperties[] = [
	// ----------------------------------
	//         group: getMany
	// ----------------------------------
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: ['group'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Archived',
				name: 'archivado',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Yes', value: 1 },
				],
				default: 0,
				description: 'Filter by archived teams',
				routing: { send: { type: 'query', property: 'archivado' } },
			},
			{
				displayName: 'Team ID',
				name: 'id',
				type: 'number',
				default: 0,
				description: 'Filter by team ID',
				routing: { send: { type: 'query', property: 'id' } },
			},
			{
				displayName: 'Public',
				name: 'publico',
				type: 'options',
				options: [
					{ name: 'No', value: 0 },
					{ name: 'Yes', value: 1 },
				],
				default: 1,
				description: 'Filter by public teams',
				routing: { send: { type: 'query', property: 'publico' } },
			},
		],
	},
];
